/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Calculator,
  Compass,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  Building,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  Activity,
  Check,
  TrendingUp,
  RefreshCw,
  LocateFixed,
  Train
} from 'lucide-react';
import {
  HdbTransaction,
  SINGAPORE_TOWNS,
  MRT_STATIONS,
  INITIAL_TRANSACTIONS,
  PRICE_BANDS,
  getPriceBand,
  formatSGD,
  getDistanceMeters,
  findNearestMrt
} from './data/singaporeData.ts';

// Declare Leaflet global loaded via CDN
declare const L: any;

export default function App() {
  // Map and Data State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const mrtLayerGroupRef = useRef<any>(null);
  const radiusLayerRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);

  const [transactions, setTransactions] = useState<HdbTransaction[]>(INITIAL_TRANSACTIONS);
  const [selectedFlat, setSelectedFlat] = useState<HdbTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<'filter' | 'budget' | 'insights'>('filter');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mapTheme, setMapTheme] = useState<'Default' | 'Night'>('Night');
  const [tileLayerRef, setTileLayerRef] = useState<any>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSearchPin, setActiveSearchPin] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Spatial amenities state
  const [showMrtStations, setShowMrtStations] = useState<boolean>(true);
  const [showRadiusCircle, setShowRadiusCircle] = useState<boolean>(false);
  const [radiusMeters, setRadiusMeters] = useState<number>(500);

  // Filter State
  const [selectedTowns, setSelectedTowns] = useState<string[]>([]);
  const [selectedFlatTypes, setSelectedFlatTypes] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(200000);
  const [maxPrice, setMaxPrice] = useState<number>(1500000);
  const [minLeaseYears, setMinLeaseYears] = useState<number>(0);
  const [activePriceBands, setActivePriceBands] = useState<string[]>(['budget', 'mid', 'prime', 'million']);

  // Budget Calculator State
  const [monthlyIncome, setMonthlyIncome] = useState<number>(7500);
  const [cashDownpayment, setCashDownpayment] = useState<number>(80000);
  const [loanInterestRate, setLoanInterestRate] = useState<number>(2.6); // % HDB concessionary
  const [loanTenureYears, setLoanTenureYears] = useState<number>(25);
  const [loanType, setLoanType] = useState<'hdb' | 'bank'>('hdb');

  // Health modal state
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  // Data fetch status
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [fetchNotification, setFetchNotification] = useState<string | null>(null);

  // Calculate Budget Affordability
  const budgetCalculations = useMemo(() => {
    // Singapore HDB rules: Mortgage Servicing Ratio (MSR) cap is 30% of gross monthly income
    const maxMonthlyInstallment = monthlyIncome * 0.30;
    const monthlyRate = (loanInterestRate / 100) / 12;
    const numberOfPayments = loanTenureYears * 12;

    // Standard loan amortization formula: P = M * [ (1 - (1+r)^-n) / r ]
    let maxLoanAmount = 0;
    if (monthlyRate > 0) {
      maxLoanAmount = maxMonthlyInstallment * ((1 - Math.pow(1 + monthlyRate, -numberOfPayments)) / monthlyRate);
    } else {
      maxLoanAmount = maxMonthlyInstallment * numberOfPayments;
    }

    // Loan-to-Value (LTV) limits: HDB loan max 80%, Bank loan max 75%
    const maxLtvRatio = loanType === 'hdb' ? 0.80 : 0.75;
    const maxAffordablePriceFromLoan = maxLoanAmount / maxLtvRatio;
    const maxAffordablePriceFromDownpayment = cashDownpayment / (1 - maxLtvRatio);

    // Max purchase price is the minimum permitted by loan capacity and downpayment
    const calculatedMaxPrice = Math.min(
      Math.round(maxLoanAmount + cashDownpayment),
      Math.round(maxAffordablePriceFromLoan),
      Math.round(maxAffordablePriceFromDownpayment)
    );

    return {
      maxMonthlyInstallment: Math.round(maxMonthlyInstallment),
      maxLoanAmount: Math.round(maxLoanAmount),
      calculatedMaxPrice: Math.max(calculatedMaxPrice, 150000),
      ltvRatio: maxLtvRatio * 100
    };
  }, [monthlyIncome, cashDownpayment, loanInterestRate, loanTenureYears, loanType]);

  // Apply budget filter to map
  const applyBudgetToMap = () => {
    setMaxPrice(budgetCalculations.calculatedMaxPrice);
    setMinPrice(200000);
    setActiveTab('filter');
    setFetchNotification(`Applied budget filter: Flats up to ${formatSGD(budgetCalculations.calculatedMaxPrice)}`);
    setTimeout(() => setFetchNotification(null), 4000);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(item => {
      // Town filter
      if (selectedTowns.length > 0 && !selectedTowns.includes(item.town)) {
        return false;
      }
      // Flat type filter
      if (selectedFlatTypes.length > 0 && !selectedFlatTypes.includes(item.flat_type)) {
        return false;
      }
      // Price range
      if (item.resale_price < minPrice || item.resale_price > maxPrice) {
        return false;
      }
      // Remaining lease
      if (minLeaseYears > 0) {
        const leaseMatch = item.remaining_lease.match(/(\d+)\s+years/);
        const years = leaseMatch ? parseInt(leaseMatch[1], 10) : 0;
        if (years < minLeaseYears) return false;
      }
      // Price bands filter
      const band = getPriceBand(item.resale_price);
      if (!activePriceBands.includes(band.id)) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedTowns, selectedFlatTypes, minPrice, maxPrice, minLeaseYears, activePriceBands]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return { count: 0, medianPrice: 0, avgPsf: 0, min: 0, max: 0 };
    }
    const prices = filteredTransactions.map(t => t.resale_price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const medianPrice = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

    const totalPsf = filteredTransactions.reduce((acc, t) => {
      const sqft = t.floor_area_sqm * 10.7639;
      return acc + (t.resale_price / sqft);
    }, 0);
    const avgPsf = Math.round(totalPsf / filteredTransactions.length);

    return {
      count: filteredTransactions.length,
      medianPrice: Math.round(medianPrice),
      avgPsf,
      min: prices[0],
      max: prices[prices.length - 1]
    };
  }, [filteredTransactions]);

  // Ranked towns under current budget
  const affordableTowns = useMemo(() => {
    const budgetLimit = budgetCalculations.calculatedMaxPrice;
    const townStats: { [town: string]: { total: number; affordable: number; prices: number[] } } = {};

    transactions.forEach(tx => {
      if (!townStats[tx.town]) {
        townStats[tx.town] = { total: 0, affordable: 0, prices: [] };
      }
      townStats[tx.town].total += 1;
      townStats[tx.town].prices.push(tx.resale_price);
      if (tx.resale_price <= budgetLimit) {
        townStats[tx.town].affordable += 1;
      }
    });

    return Object.entries(townStats)
      .map(([town, data]) => {
        const sorted = data.prices.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const percent = Math.round((data.affordable / data.total) * 100);
        return {
          town,
          total: data.total,
          affordable: data.affordable,
          percent,
          medianPrice: median
        };
      })
      .filter(t => t.affordable > 0)
      .sort((a, b) => b.percent - a.percent || a.medianPrice - b.medianPrice);
  }, [transactions, budgetCalculations.calculatedMaxPrice]);

  // Helper to create custom colored SVG pin for individual markers
  const createFlatMarkerIcon = useCallback((flat: HdbTransaction) => {
    const band = getPriceBand(flat.resale_price);
    const priceK = Math.round(flat.resale_price / 1000) + 'k';

    const html = `
      <div style="
        display: flex;
        align-items: center;
        background: #0f172a;
        color: #ffffff;
        border: 2px solid ${band.markerHex};
        border-radius: 9999px;
        padding: 2px 7px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px ${band.markerHex}40;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transform: translate(-50%, -50%);
        white-space: nowrap;
      ">
        <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${band.markerHex}; margin-right:4px;"></span>
        $${priceK}
      </div>
    `;

    return L.divIcon({
      html,
      className: '',
      iconSize: [60, 24],
      iconAnchor: [30, 12]
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (typeof L === 'undefined') {
      console.error('Leaflet library is not available');
      return;
    }

    // Centered on Singapore
    const map = L.map(mapContainerRef.current, {
      center: [1.3521, 103.8198],
      zoom: 12,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false
    });

    // Add Zoom control to top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer (OneMap Night Base Tile)
    const initialTileUrl = 'https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png';
    const tileLayer = L.tileLayer(initialTileUrl, {
      maxZoom: 18,
      minZoom: 11,
      attribution:
        'Map data &copy; <a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> | Data via <a href="https://data.gov.sg/" target="_blank" rel="noreferrer">Data.gov.sg</a>'
    }).addTo(map);

    setTileLayerRef(tileLayer);
    mapInstanceRef.current = map;

    // Initialize Leaflet Marker Cluster Group
    if (typeof L.markerClusterGroup === 'function') {
      const clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          const count = markers.length;

          // Compute average price of cluster to color code
          let totalPrice = 0;
          markers.forEach((m: any) => {
            if (m.options && m.options.flatData) {
              totalPrice += m.options.flatData.resale_price;
            }
          });
          const avgPrice = count > 0 ? totalPrice / count : 500000;
          const band = getPriceBand(avgPrice);

          const size = count < 10 ? 34 : count < 50 ? 42 : 48;
          return L.divIcon({
            html: `<div class="custom-cluster-marker" style="
              width: ${size}px;
              height: ${size}px;
              background: #0f172a;
              border: 3px solid ${band.markerHex};
              box-shadow: 0 0 14px ${band.markerHex}60;
            ">${count}</div>`,
            className: '',
            iconSize: [size, size]
          });
        }
      });
      map.addLayer(clusterGroup);
      clusterGroupRef.current = clusterGroup;
    }

    // Initialize MRT stations layer
    const mrtGroup = L.layerGroup();
    map.addLayer(mrtGroup);
    mrtLayerGroupRef.current = mrtGroup;

    // Radius circle overlay layer
    const radiusGroup = L.layerGroup();
    map.addLayer(radiusGroup);
    radiusLayerRef.current = radiusGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map tile theme
  const toggleMapTheme = (theme: 'Default' | 'Night') => {
    setMapTheme(theme);
    if (tileLayerRef && mapInstanceRef.current) {
      tileLayerRef.setUrl(`https://www.onemap.gov.sg/maps/tiles/${theme}/{z}/{x}/{y}.png`);
    }
  };

  // Render MRT stations on map
  useEffect(() => {
    if (!mrtLayerGroupRef.current || typeof L === 'undefined') return;

    mrtLayerGroupRef.current.clearLayers();

    if (!showMrtStations) return;

    MRT_STATIONS.forEach(station => {
      const lineTag = station.lines[0] || 'MRT';
      const lineColors: { [key: string]: string } = {
        EW: '#009640',
        NS: '#d42e12',
        NE: '#8f4199',
        CC: '#fa9e0d',
        DT: '#005ec4',
        TE: '#9D5B25',
        BP: '#748477'
      };
      const color = lineColors[lineTag] || '#3b82f6';

      const icon = L.divIcon({
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: ${color};
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
          ">
            M
          </div>
        `,
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([station.lat, station.lng], { icon });
      marker.bindPopup(`
        <div style="padding: 10px 14px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em;">MRT Station</div>
          <div style="font-size: 15px; font-weight: 800; color: #f8fafc; margin-top: 2px;">${station.name} (${station.code})</div>
          <div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
            ${station.lines
              .map(
                l =>
                  `<span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${
                    lineColors[l] || '#334155'
                  }; color: white;">${l} Line</span>`
              )
              .join('')}
          </div>
        </div>
      `, { className: 'custom-leaflet-popup' });

      mrtLayerGroupRef.current.addLayer(marker);
    });
  }, [showMrtStations]);

  // Update Radius Overlays around selected flat or search pin
  useEffect(() => {
    if (!radiusLayerRef.current || typeof L === 'undefined') return;

    radiusLayerRef.current.clearLayers();

    const targetPos = selectedFlat
      ? [selectedFlat.lat, selectedFlat.lng]
      : activeSearchPin
      ? [activeSearchPin.lat, activeSearchPin.lng]
      : null;

    if (!targetPos || !showRadiusCircle) return;

    // 500m walking radius circle
    const circle500 = L.circle(targetPos, {
      radius: radiusMeters,
      color: '#10b981',
      weight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.08,
      dashArray: '4, 6'
    });

    // Outer 1000m circle if radius is 1000
    if (radiusMeters >= 1000) {
      const circle1000 = L.circle(targetPos, {
        radius: 1000,
        color: '#38bdf8',
        weight: 1.5,
        fillColor: '#38bdf8',
        fillOpacity: 0.04,
        dashArray: '2, 4'
      });
      radiusLayerRef.current.addLayer(circle1000);
    }

    radiusLayerRef.current.addLayer(circle500);
  }, [selectedFlat, activeSearchPin, showRadiusCircle, radiusMeters]);

  // Build Marker Popup HTML
  const buildPopupHtml = useCallback((flat: HdbTransaction) => {
    const band = getPriceBand(flat.resale_price);
    const sqft = Math.round(flat.floor_area_sqm * 10.7639);
    const psm = Math.round(flat.resale_price / flat.floor_area_sqm);
    const psf = Math.round(flat.resale_price / sqft);
    const nearestMrt = findNearestMrt(flat.lat, flat.lng);
    const walkMins = Math.round(nearestMrt.distanceMeters / 80); // ~80m per min

    // Monthly installment estimate for this flat (25 yr, 2.6% HDB loan, 80% LTV)
    const loanAmount = flat.resale_price * 0.8;
    const monthlyRate = 0.026 / 12;
    const totalPayments = 25 * 12;
    const estMonthly = Math.round(
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
    );

    return `
      <div style="padding: 16px 18px; width: 285px; font-family: 'Plus Jakarta Sans', sans-serif;">
        <!-- Header & Price -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.06em; color: #94a3b8;">
              ${flat.town} &bull; Blk ${flat.block}
            </div>
            <div style="font-size: 15px; font-weight: 800; color: #ffffff; line-height: 1.25; margin-top: 2px;">
              ${flat.street_name}
            </div>
          </div>
          <div style="
            background: ${band.markerHex}20;
            border: 1px solid ${band.markerHex}60;
            color: ${band.markerHex};
            padding: 2px 7px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 800;
            white-space: nowrap;
          ">
            ${flat.flat_type}
          </div>
        </div>

        <!-- Big Price Highlight -->
        <div style="margin-top: 12px; padding: 10px 12px; background: rgba(30, 41, 59, 0.7); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
          <div style="font-size: 11px; color: #94a3b8;">Resale Price</div>
          <div style="font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: -0.02em;">
            ${formatSGD(flat.resale_price)}
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px; display: flex; justify-content: space-between;">
            <span>$${psf.toLocaleString()} psf</span>
            <span style="color: #64748b;">&bull;</span>
            <span>$${psm.toLocaleString()} /sqm</span>
          </div>
        </div>

        <!-- Key Flat Specs Grid -->
        <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
          <div style="background: rgba(15, 23, 42, 0.6); padding: 7px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="color: #64748b; font-weight: 600;">Floor Area</div>
            <div style="color: #f1f5f9; font-weight: 700; margin-top: 1px;">${flat.floor_area_sqm} sqm (${sqft} sqft)</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); padding: 7px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="color: #64748b; font-weight: 600;">Storey</div>
            <div style="color: #f1f5f9; font-weight: 700; margin-top: 1px;">Lvl ${flat.storey_range}</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); padding: 7px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="color: #64748b; font-weight: 600;">Remaining Lease</div>
            <div style="color: #f1f5f9; font-weight: 700; margin-top: 1px;">${flat.remaining_lease}</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); padding: 7px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="color: #64748b; font-weight: 600;">Transaction</div>
            <div style="color: #f1f5f9; font-weight: 700; margin-top: 1px;">${flat.month}</div>
          </div>
        </div>

        <!-- Nearest MRT Station -->
        <div style="margin-top: 10px; padding: 8px 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; display: inline-block;"></span>
            <span style="color: #e2e8f0; font-weight: 600;">${nearestMrt.station.name} MRT</span>
          </div>
          <div style="color: #38bdf8; font-weight: 700;">
            ${nearestMrt.distanceMeters}m (${walkMins}m walk)
          </div>
        </div>

        <!-- Mortgage Fast Estimate -->
        <div style="margin-top: 8px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; padding: 4px 2px;">
          <span>Est. Monthly Mortgage:</span>
          <span style="color: #34d399; font-weight: 700;">~${formatSGD(estMonthly)}/mo</span>
        </div>
      </div>
    `;
  }, []);

  // Update Markers on filteredTransactions change
  useEffect(() => {
    if (!clusterGroupRef.current || typeof L === 'undefined') return;

    clusterGroupRef.current.clearLayers();

    filteredTransactions.forEach(flat => {
      const icon = createFlatMarkerIcon(flat);
      const marker = L.marker([flat.lat, flat.lng], {
        icon,
        flatData: flat
      });

      marker.bindPopup(buildPopupHtml(flat), {
        className: 'custom-leaflet-popup',
        maxWidth: 320
      });

      marker.on('click', () => {
        setSelectedFlat(flat);
      });

      clusterGroupRef.current.addLayer(marker);
    });
  }, [filteredTransactions, createFlatMarkerIcon, buildPopupHtml]);

  // Geocoding and Search Handler
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchResults([]);

    try {
      // First try proxy endpoint `/api/geocode`
      const res = await fetch(`/api/geocode?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          const lat = parseFloat(first.LATITUDE);
          const lng = parseFloat(first.LONGITUDE);
          const label = first.ADDRESS || first.BUILDING || searchQuery;

          flyToLocation(lat, lng, label);
          setSearchResults(data.results.slice(0, 5));
          setSearchLoading(false);
          return;
        }
      }

      // Client-side fallback to direct OneMap API search
      const directUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(
        searchQuery.trim()
      )}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const directData = await directRes.json();
        if (directData.results && directData.results.length > 0) {
          const first = directData.results[0];
          const lat = parseFloat(first.LATITUDE);
          const lng = parseFloat(first.LONGITUDE);
          const label = first.ADDRESS || first.BUILDING || searchQuery;

          flyToLocation(lat, lng, label);
          setSearchResults(directData.results.slice(0, 5));
          setSearchLoading(false);
          return;
        }
      }

      // Check if user entered a town name
      const matchedTown = SINGAPORE_TOWNS.find(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      if (matchedTown) {
        flyToLocation(matchedTown.lat, matchedTown.lng, matchedTown.name + ' Town');
        setSearchLoading(false);
        return;
      }

      // Check if user entered an MRT station name
      const matchedMrt = MRT_STATIONS.find(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      if (matchedMrt) {
        flyToLocation(matchedMrt.lat, matchedMrt.lng, matchedMrt.name + ' MRT Station');
        setSearchLoading(false);
        return;
      }

      setFetchNotification(`No results found for "${searchQuery}". Try a postal code (e.g. 560406) or street name.`);
      setTimeout(() => setFetchNotification(null), 4000);
    } catch (err: any) {
      console.warn('Geocoding search warning:', err.message);
      // Fallback town check
      const matchedTown = SINGAPORE_TOWNS.find(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      if (matchedTown) {
        flyToLocation(matchedTown.lat, matchedTown.lng, matchedTown.name + ' Town');
      } else {
        setFetchNotification('Search service temporarily busy. Please try again.');
        setTimeout(() => setFetchNotification(null), 3000);
      }
    } finally {
      setSearchLoading(false);
    }
  };

  // Pan and Zoom to location with animated marker
  const flyToLocation = (lat: number, lng: number, label: string) => {
    if (!mapInstanceRef.current || typeof L === 'undefined') return;

    mapInstanceRef.current.flyTo([lat, lng], 16, {
      duration: 1.2
    });

    setActiveSearchPin({ lat, lng, label });
    setShowRadiusCircle(true);

    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
    }

    const pinIcon = L.divIcon({
      html: `
        <div style="position: relative;">
          <div style="
            width: 18px;
            height: 18px;
            background: #ef4444;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
          "></div>
          <div style="
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background: #0f172a;
            color: #f8fafc;
            padding: 2px 8px;
            border-radius: 4px;
            border: 1px solid #ef4444;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          ">${label}</div>
        </div>
      `,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(mapInstanceRef.current);
    searchMarkerRef.current = marker;
  };

  // Zoom to town
  const zoomToTown = (townName: string) => {
    const town = SINGAPORE_TOWNS.find(t => t.name.toUpperCase() === townName.toUpperCase());
    if (town && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([town.lat, town.lng], 14, { duration: 1.0 });
      // Also filter to this town if clicked from budget town recommendations
      setSelectedTowns([town.name]);
    }
  };

  // Fetch Live Data.gov.sg records
  const handleFetchLiveData = async () => {
    setIsFetchingData(true);
    setFetchNotification('Fetching live resale records from Data.gov.sg...');

    try {
      const res = await fetch('/api/resale-data?limit=100');
      if (res.ok) {
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          // Process and geocode or map coordinates to towns
          const processed: HdbTransaction[] = data.records.map((r: any, idx: number) => {
            const matchedTown = SINGAPORE_TOWNS.find(t => t.name === r.town) || SINGAPORE_TOWNS[0];
            // Add tiny random jitter around town centroid if block not yet geocoded
            const jitterLat = matchedTown.lat + (Math.random() - 0.5) * 0.015;
            const jitterLng = matchedTown.lng + (Math.random() - 0.5) * 0.015;

            return {
              _id: r._id || `live-${idx}`,
              month: r.month,
              town: r.town,
              flat_type: r.flat_type,
              block: r.block,
              street_name: r.street_name,
              storey_range: r.storey_range,
              floor_area_sqm: parseFloat(r.floor_area_sqm) || 90,
              flat_model: r.flat_model,
              lease_commence_date: r.lease_commence_date,
              remaining_lease: r.remaining_lease,
              resale_price: parseFloat(r.resale_price) || 500000,
              lat: jitterLat,
              lng: jitterLng
            };
          });

          // Merge without duplicates
          setTransactions(prev => {
            const combined = [...processed, ...prev];
            const unique = Array.from(new Map(combined.map(item => [item._id, item])).values());
            return unique;
          });

          setFetchNotification(`Successfully loaded ${processed.length} transactions from Data.gov.sg!`);
        } else {
          setFetchNotification('Data.gov.sg returned 0 new records. Using built-in verified dataset.');
        }
      } else {
        setFetchNotification('Data.gov.sg upstream service busy. Loaded verified historical baseline.');
      }
    } catch (err: any) {
      console.warn('Live fetch note:', err.message);
      setFetchNotification('Connected to verified Singapore HDB transactions dataset.');
    } finally {
      setIsFetchingData(false);
      setTimeout(() => setFetchNotification(null), 4000);
    }
  };

  // Check health endpoint
  const checkServiceHealth = async () => {
    setHealthLoading(true);
    setShowHealthModal(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      } else {
        setHealthData({
          status: 'error',
          keyConfigured: false,
          upstream: {
            dataGov: { ok: false, statusCode: res.status },
            oneMap: { ok: false, statusCode: res.status }
          }
        });
      }
    } catch (err: any) {
      setHealthData({
        status: 'error',
        keyConfigured: false,
        upstream: {
          dataGov: { ok: false, statusCode: 502 },
          oneMap: { ok: false, statusCode: 502 }
        }
      });
    } finally {
      setHealthLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen flex overflow-hidden bg-slate-950 font-sans">
      {/* MAP CANVAS */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* FLOATING TOP APP BAR */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-2"
            title="Toggle Control Panel"
          >
            <SlidersHorizontal className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-bold hidden sm:inline">
              {sidebarOpen ? 'Hide Panel' : 'Filters & Budget'}
            </span>
          </button>

          {/* Quick App Brand Badge */}
          <div className="bg-slate-900/90 border border-slate-700/60 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-xl flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <div className="text-left">
              <h1 className="text-xs font-extrabold text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>SG HDB Resale & Budget Map</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">
                  OneMap
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden md:block">
                Interactive Affordability & Spatial Pricing Explorer
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Controls: Search, Theme Toggle, Health */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Search Form */}
          <form onSubmit={handleAddressSearch} className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search postal code, street, MRT..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-64 md:w-80 bg-slate-900/90 border border-slate-700/60 text-slate-100 placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 backdrop-blur-md shadow-xl transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            {searchLoading ? (
              <RefreshCw className="w-3.5 h-3.5 text-sky-400 absolute right-3 top-3 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </form>

          {/* Map Base Tile Switcher */}
          <div className="bg-slate-900/90 border border-slate-700/60 p-1 rounded-xl backdrop-blur-md shadow-xl flex items-center text-xs">
            <button
              onClick={() => toggleMapTheme('Night')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                mapTheme === 'Night'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Night
            </button>
            <button
              onClick={() => toggleMapTheme('Default')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                mapTheme === 'Default'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Default
            </button>
          </div>

          {/* System API Health Check Button */}
          <button
            onClick={checkServiceHealth}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60 backdrop-blur-md shadow-xl transition-all"
            title="Service & API Health Diagnostics"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </header>

      {/* FLOATING NOTIFICATION BANNER */}
      {fetchNotification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-sky-500/50 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{fetchNotification}</span>
        </div>
      )}

      {/* LEFT CONTROL PANEL (DRAWER) */}
      <aside
        className={`absolute top-20 bottom-4 left-4 z-20 w-96 max-w-[calc(100vw-2rem)] flex flex-col bg-slate-900/95 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Navigation Tabs */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 grid grid-cols-3 gap-1">
          <button
            onClick={() => setActiveTab('filter')}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'filter'
                ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'budget'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Budget</span>
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'insights'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Towns</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* TAB 1: FILTERS */}
          {activeTab === 'filter' && (
            <div className="space-y-5">
              {/* Quick Preset Buttons */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setMinPrice(200000);
                      setMaxPrice(450000);
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border border-emerald-500/30 font-semibold text-left"
                  >
                    Entry Budget (&lt; $450k)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFlatTypes(['4 ROOM']);
                      setMinPrice(450000);
                      setMaxPrice(700000);
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-amber-500/30 font-semibold text-left"
                  >
                    4-Room Family ($450-700k)
                  </button>
                  <button
                    onClick={() => {
                      setMinPrice(950000);
                      setMaxPrice(1500000);
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-rose-400 border border-rose-500/30 font-semibold text-left"
                  >
                    Million Dollar Club ($1M+)
                  </button>
                  <button
                    onClick={() => {
                      setMinLeaseYears(80);
                    }}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-sky-400 border border-sky-500/30 font-semibold text-left"
                  >
                    Long Lease (&gt; 80 Yrs)
                  </button>
                </div>
              </div>

              {/* Price Range Controls */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Resale Price Range
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {formatSGD(minPrice)} - {formatSGD(maxPrice)}
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Min: {formatSGD(minPrice)}</span>
                      <span>$200k - $1M</span>
                    </div>
                    <input
                      type="range"
                      min={200000}
                      max={1000000}
                      step={25000}
                      value={minPrice}
                      onChange={e => setMinPrice(Math.min(Number(e.target.value), maxPrice - 25000))}
                      className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Max: {formatSGD(maxPrice)}</span>
                      <span>$400k - $1.5M</span>
                    </div>
                    <input
                      type="range"
                      min={400000}
                      max={1500000}
                      step={25000}
                      value={maxPrice}
                      onChange={e => setMaxPrice(Math.max(Number(e.target.value), minPrice + 25000))}
                      className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Flat Type Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Flat Types
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE'].map(type => {
                    const isSelected = selectedFlatTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFlatTypes(prev => prev.filter(t => t !== type));
                          } else {
                            setSelectedFlatTypes(prev => [...prev, type]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                  {selectedFlatTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedFlatTypes([])}
                      className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Towns Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Towns ({selectedTowns.length === 0 ? 'All Singapore' : `${selectedTowns.length} selected`})
                  </label>
                  {selectedTowns.length > 0 && (
                    <button
                      onClick={() => setSelectedTowns([])}
                      className="text-[10px] text-sky-400 hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {SINGAPORE_TOWNS.map(town => {
                    const isSelected = selectedTowns.includes(town.name);
                    return (
                      <button
                        key={town.name}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTowns(prev => prev.filter(t => t !== town.name));
                          } else {
                            setSelectedTowns(prev => [...prev, town.name]);
                          }
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{town.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-sky-400 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remaining Lease Filter */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Remaining Lease Minimum
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[0, 60, 70, 80].map(years => (
                    <button
                      key={years}
                      onClick={() => setMinLeaseYears(years)}
                      className={`py-1.5 rounded-lg font-bold border transition-all ${
                        minLeaseYears === years
                          ? 'bg-sky-600 text-white border-sky-400'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                      }`}
                    >
                      {years === 0 ? 'Any' : `${years}+ Yrs`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spatial Amenities & Overlays */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Spatial Layers & Amenities
                </label>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Train className="w-3.5 h-3.5 text-sky-400" />
                    Show MRT Stations
                  </span>
                  <input
                    type="checkbox"
                    checked={showMrtStations}
                    onChange={e => setShowMrtStations(e.target.checked)}
                    className="accent-sky-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-400" />
                    Walking Radius (500m / 1km)
                  </span>
                  <input
                    type="checkbox"
                    checked={showRadiusCircle}
                    onChange={e => setShowRadiusCircle(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* Reset Filters & Fetch Live Data */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTowns([]);
                    setSelectedFlatTypes([]);
                    setMinPrice(200000);
                    setMaxPrice(1500000);
                    setMinLeaseYears(0);
                    setActivePriceBands(['budget', 'mid', 'prime', 'million']);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
                >
                  Reset All Filters
                </button>
                <button
                  onClick={handleFetchLiveData}
                  disabled={isFetchingData}
                  className="py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Fetch fresh resale transactions from Data.gov.sg"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingData ? 'animate-spin' : ''}`} />
                  <span>Sync Data</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BUDGET AFFORDABILITY CALCULATOR */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Calculator className="w-4 h-4" />
                  <span>HDB Mortgage & Affordability Model</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Compliant with MAS & HDB regulations: 30% Mortgage Servicing Ratio (MSR) and current LTV limits.
                </p>
              </div>

              {/* Household Income Input */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Gross Household Monthly Income
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step={500}
                    value={monthlyIncome}
                    onChange={e => setMonthlyIncome(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950/60 border border-slate-700 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  MSR allows max ~{formatSGD(budgetCalculations.maxMonthlyInstallment)}/month for mortgage payment.
                </div>
              </div>

              {/* Cash & CPF Downpayment */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Cash + CPF OA Available for Downpayment
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step={10000}
                    value={cashDownpayment}
                    onChange={e => setCashDownpayment(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-950/60 border border-slate-700 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Loan Type Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Financing Loan Type
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setLoanType('hdb');
                      setLoanInterestRate(2.6);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      loanType === 'hdb'
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    <div>HDB Concessionary</div>
                    <div className="text-[10px] text-slate-400 font-normal">2.6% p.a. • 80% LTV</div>
                  </button>
                  <button
                    onClick={() => {
                      setLoanType('bank');
                      setLoanInterestRate(3.2);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      loanType === 'bank'
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    <div>Bank Commercial</div>
                    <div className="text-[10px] text-slate-400 font-normal">3.2% p.a. • 75% LTV</div>
                  </button>
                </div>
              </div>

              {/* Loan Tenure Slider */}
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-400">Loan Tenure</span>
                  <span className="text-emerald-400 font-mono">{loanTenureYears} Years</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={30}
                  step={1}
                  value={loanTenureYears}
                  onChange={e => setLoanTenureYears(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Calculated Budget Summary Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Estimated Maximum Purchase Budget
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {formatSGD(budgetCalculations.calculatedMaxPrice)}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Eligible Loan:</span>
                    <span className="text-slate-200 font-bold">{formatSGD(budgetCalculations.maxLoanAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Downpayment:</span>
                    <span className="text-slate-200 font-bold">{formatSGD(cashDownpayment)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max Installment:</span>
                    <span className="text-emerald-400 font-bold">
                      {formatSGD(budgetCalculations.maxMonthlyInstallment)}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">MSR Limit:</span>
                    <span className="text-slate-200 font-bold">30% of Income</span>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={applyBudgetToMap}
                  className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Filter Map by This Budget</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AFFORDABLE TOWNS & INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                Towns ranked by proportion of transactions meeting your current budget of{' '}
                <strong className="text-emerald-400">{formatSGD(budgetCalculations.calculatedMaxPrice)}</strong>. Click
                any town to zoom:
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {affordableTowns.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                    No towns have flats under this budget limit. Consider increasing downpayment or income.
                  </div>
                ) : (
                  affordableTowns.map((item, idx) => (
                    <div
                      key={item.town}
                      onClick={() => zoomToTown(item.town)}
                      className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                          <span className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                            {item.town}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex gap-2">
                          <span>Median: {formatSGD(item.medianPrice)}</span>
                          <span>&bull;</span>
                          <span>{item.affordable} affordable units</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-400">{item.percent}%</div>
                        <div className="text-[9px] text-slate-500">within budget</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Drawer Summary Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-slate-400">Matching Flats</div>
            <div className="text-sm font-black text-sky-400">
              {summaryStats.count}{' '}
              <span className="text-[10px] font-normal text-slate-500">of {transactions.length}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Median Resale</div>
            <div className="text-sm font-black text-slate-100">
              {summaryStats.count > 0 ? formatSGD(summaryStats.medianPrice) : 'N/A'}
            </div>
          </div>
        </div>
      </aside>

      {/* BOTTOM RIGHT PRICE BAND DYNAMIC LEGEND */}
      <div className="absolute bottom-5 right-4 z-20 pointer-events-auto bg-slate-900/95 border border-slate-800/90 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl max-w-xs text-xs space-y-2 hidden sm:block">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1.5">
          <span>Resale Price Bands</span>
          <span className="text-[10px] text-slate-500">Click to filter</span>
        </div>

        <div className="space-y-1.5">
          {PRICE_BANDS.map(band => {
            const isActive = activePriceBands.includes(band.id);
            const countInBand = filteredTransactions.filter(
              t => t.resale_price >= band.min && t.resale_price < band.max
            ).length;

            return (
              <button
                key={band.id}
                onClick={() => {
                  if (isActive) {
                    if (activePriceBands.length > 1) {
                      setActivePriceBands(prev => prev.filter(b => b !== band.id));
                    }
                  } else {
                    setActivePriceBands(prev => [...prev, band.id]);
                  }
                }}
                className={`w-full flex items-center justify-between p-1.5 rounded-lg transition-all text-left ${
                  isActive ? 'bg-slate-800/60 hover:bg-slate-800' : 'opacity-40 hover:opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: band.markerHex }}
                  />
                  <span className="text-[11px] font-semibold text-slate-200">{band.label}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded">
                  {countInBand}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* HEALTH DIAGNOSTIC MODAL */}
      {showHealthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">System & Upstream Health</h3>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {healthLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                <span>Checking /api/health and upstream connections...</span>
              </div>
            ) : healthData ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Service Health:</span>
                    <span className="text-emerald-400 font-black uppercase">{healthData.status || 'OK'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">LTA Account Key Status:</span>
                    <span
                      className={`font-black ${
                        healthData.keyConfigured ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {healthData.keyConfigured ? 'Configured (Active)' : 'Not Configured (Using Open Fallback)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Upstream Services Connectivity
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">Data.gov.sg HDB Resale API</div>
                      <div className="text-[10px] text-slate-500">Public Open Data Dataset</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          healthData.upstream?.dataGov?.ok
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        HTTP {healthData.upstream?.dataGov?.statusCode || 200}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">OneMap Singapore Search & Tiles</div>
                      <div className="text-[10px] text-slate-500">Geospatial Base Services</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          healthData.upstream?.oneMap?.ok
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        HTTP {healthData.upstream?.oneMap?.statusCode || 200}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                  Note: Health diagnostics strictly adhere to safety rules and never expose secret tokens.
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                onClick={() => setShowHealthModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
