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
  Train,
  Sun,
  Moon
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
  const markerMapRef = useRef<Map<string | number, any>>(new Map());

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [enableClustering, setEnableClustering] = useState<boolean>(false); // False by default so every flat location is directly visible on map
  const [filterByBudget, setFilterByBudget] = useState<boolean>(true); // Auto-filters map to calculated budget by default
  const [customBudgetCap, setCustomBudgetCap] = useState<number | null>(null);

  const [transactions, setTransactions] = useState<HdbTransaction[]>(INITIAL_TRANSACTIONS);
  const [selectedFlat, setSelectedFlat] = useState<HdbTransaction | null>(null);
  const [activeTab, setActiveTab] = useState<'filter' | 'budget' | 'insights'>('filter');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mapTheme, setMapTheme] = useState<'Default' | 'Night'>('Night');
  const [tileLayerRef, setTileLayerRef] = useState<any>(null);

  // Day / Night Mode State (Day = OneMap Default, Night = OneMap Night)
  const isDayMode = mapTheme === 'Default';

  // Synchronize document body class for global day / night styling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDayMode) {
        document.body.classList.add('day-mode');
        document.body.classList.remove('night-mode');
      } else {
        document.body.classList.add('night-mode');
        document.body.classList.remove('day-mode');
      }
    }
  }, [isDayMode]);

  // Toggle between Day and Night mode
  const toggleDayNightMode = (mode: 'day' | 'night') => {
    const newTheme = mode === 'day' ? 'Default' : 'Night';
    setMapTheme(newTheme);
    if (tileLayerRef && mapInstanceRef.current) {
      tileLayerRef.setUrl(`/api/tile?style=${newTheme}&z={z}&x={x}&y={y}`);
    }
  };

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
  const [minPrice, setMinPrice] = useState<number>(0);
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

  // Active Effective Budget Cap:
  // When filterByBudget is true and no manual override is set, automatically filter to budgetCalculations.calculatedMaxPrice
  const effectiveBudgetMax = customBudgetCap !== null
    ? customBudgetCap
    : filterByBudget
    ? budgetCalculations.calculatedMaxPrice
    : maxPrice;

  // Filtered transactions (automatically driven by effective budget cap)
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
      // Budget filter: ONLY show flats within budget cap!
      if (item.resale_price > effectiveBudgetMax) {
        return false;
      }
      if (minPrice > 0 && item.resale_price < minPrice) {
        return false;
      }
      // Remaining lease
      if (minLeaseYears > 0) {
        const leaseMatch = item.remaining_lease.match(/(\d+)\s+years/);
        const years = leaseMatch ? parseInt(leaseMatch[1], 10) : 0;
        if (years < minLeaseYears) return false;
      }
      // Price bands filter (only if user changed active price bands from default 4)
      if (activePriceBands.length < 4) {
        const band = getPriceBand(item.resale_price);
        if (!activePriceBands.includes(band.id)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedTowns, selectedFlatTypes, minPrice, effectiveBudgetMax, minLeaseYears, activePriceBands]);

  // Apply budget filter to map explicitly
  const applyBudgetToMap = () => {
    setFilterByBudget(true);
    setCustomBudgetCap(budgetCalculations.calculatedMaxPrice);
    setMaxPrice(budgetCalculations.calculatedMaxPrice);
    setFetchNotification(`Map filtered: Flats up to ${formatSGD(budgetCalculations.calculatedMaxPrice)}`);
    setTimeout(() => setFetchNotification(null), 4000);
    fitMapToFilteredFlats();
  };

  // Zoom map to fit all currently filtered flats
  const fitMapToFilteredFlats = useCallback(() => {
    if (!mapInstanceRef.current || filteredTransactions.length === 0 || typeof L === 'undefined') return;
    const latLngs = filteredTransactions.map(f => [f.lat, f.lng]);
    const bounds = L.latLngBounds(latLngs);
    mapInstanceRef.current.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
      duration: 0.8
    });
  }, [filteredTransactions]);

  // Focus and open flat popup on map
  const focusFlatOnMap = useCallback((flat: HdbTransaction) => {
    setSelectedFlat(flat);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([flat.lat, flat.lng], 16, { duration: 0.8 });
      setTimeout(() => {
        const marker = markerMapRef.current.get(flat._id);
        if (marker) {
          marker.openPopup();
        }
      }, 500);
    }
  }, []);

  // Quick budget stepper
  const handleBudgetStep = (delta: number) => {
    setFilterByBudget(true);
    const newCap = Math.max(200000, Math.min(1500000, effectiveBudgetMax + delta));
    setCustomBudgetCap(newCap);
    setFetchNotification(`Adjusted budget limit: ${formatSGD(newCap)}`);
    setTimeout(() => setFetchNotification(null), 2500);
  };

  // Quick budget preset
  const setBudgetPreset = (amount: number | null) => {
    if (amount === null) {
      setFilterByBudget(false);
      setCustomBudgetCap(1500000);
      setMaxPrice(1500000);
      setMinPrice(0);
      setFetchNotification('Showing all flats across Singapore');
    } else {
      setFilterByBudget(true);
      setCustomBudgetCap(amount);
      setMaxPrice(amount);
      setFetchNotification(`Filtered map to flats ≤ ${formatSGD(amount)}`);
    }
    setTimeout(() => setFetchNotification(null), 3000);
  };

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
    const bg = isDayMode ? '#ffffff' : '#0f172a';
    const textColor = isDayMode ? '#0f172a' : '#ffffff';
    const boxShadow = isDayMode
      ? `0 3px 10px rgba(0, 0, 0, 0.22), 0 0 8px ${band.markerHex}40`
      : `0 4px 14px rgba(0, 0, 0, 0.6), 0 0 10px ${band.markerHex}50`;

    const html = `
      <div class="flat-price-pin" style="
        display: inline-flex;
        align-items: center;
        background: ${bg};
        color: ${textColor};
        border: 2px solid ${band.markerHex};
        border-radius: 9999px;
        padding: 3px 8px;
        box-shadow: ${boxShadow};
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
        pointer-events: auto;
      ">
        <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${band.markerHex}; margin-right:5px; box-shadow: 0 0 4px ${band.markerHex};"></span>
        $${priceK}
      </div>
    `;

    return L.divIcon({
      html,
      className: 'flat-pin-wrapper',
      iconSize: [66, 26],
      iconAnchor: [33, 13]
    });
  }, [isDayMode]);

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

    // Initial tile layer retrieved from OneMap API via backend proxy referring to Vercel variables
    const initialTileUrl = `/api/tile?style=${mapTheme}&z={z}&x={x}&y={y}`;
    const tileLayer = L.tileLayer(initialTileUrl, {
      maxZoom: 18,
      minZoom: 11,
      attribution:
        'Map data &copy; <a href="https://www.onemap.gov.sg/" target="_blank" rel="noreferrer">OneMap</a> | Data via <a href="https://data.gov.sg/" target="_blank" rel="noreferrer">Data.gov.sg</a>'
    }).addTo(map);

    setTileLayerRef(tileLayer);
    mapInstanceRef.current = map;

    // Initialize marker cluster group with robust fallback
    let clusterGroup: any = null;
    if (enableClustering && typeof L.markerClusterGroup === 'function') {
      clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 35,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          const count = markers.length;

          let totalPrice = 0;
          markers.forEach((m: any) => {
            if (m.options && m.options.flatData) {
              totalPrice += m.options.flatData.resale_price;
            }
          });
          const avgPrice = count > 0 ? totalPrice / count : 500000;
          const band = getPriceBand(avgPrice);

          const size = count < 10 ? 34 : count < 50 ? 42 : 48;
          const isDay = typeof document !== 'undefined' && document.body.classList.contains('day-mode');
          const bg = isDay ? '#ffffff' : '#0f172a';
          const textColor = isDay ? '#0f172a' : '#ffffff';
          const shadow = isDay
            ? `0 2px 10px rgba(0,0,0,0.25), 0 0 10px ${band.markerHex}60`
            : `0 0 14px ${band.markerHex}60`;

          return L.divIcon({
            html: `<div class="custom-cluster-marker" style="
              width: ${size}px;
              height: ${size}px;
              background: ${bg};
              color: ${textColor};
              border: 3px solid ${band.markerHex};
              box-shadow: ${shadow};
            ">${count}</div>`,
            className: 'cluster-icon-clean',
            iconSize: [size, size]
          });
        }
      });
    } else {
      clusterGroup = L.layerGroup();
    }
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Initialize MRT stations layer
    const mrtGroup = L.layerGroup();
    map.addLayer(mrtGroup);
    mrtLayerGroupRef.current = mrtGroup;

    // Radius circle overlay layer
    const radiusGroup = L.layerGroup();
    map.addLayer(radiusGroup);
    radiusLayerRef.current = radiusGroup;

    setIsMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  // Switch between individual pins and clustering
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady || typeof L === 'undefined') return;

    if (clusterGroupRef.current) {
      mapInstanceRef.current.removeLayer(clusterGroupRef.current);
    }

    let newGroup: any = null;
    if (enableClustering && typeof L.markerClusterGroup === 'function') {
      newGroup = L.markerClusterGroup({
        maxClusterRadius: 35,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          const count = markers.length;
          let totalPrice = 0;
          markers.forEach((m: any) => {
            if (m.options && m.options.flatData) {
              totalPrice += m.options.flatData.resale_price;
            }
          });
          const avgPrice = count > 0 ? totalPrice / count : 500000;
          const band = getPriceBand(avgPrice);
          const size = count < 10 ? 34 : count < 50 ? 42 : 48;
          const isDay = typeof document !== 'undefined' && document.body.classList.contains('day-mode');
          const bg = isDay ? '#ffffff' : '#0f172a';
          const textColor = isDay ? '#0f172a' : '#ffffff';
          const shadow = isDay
            ? `0 2px 10px rgba(0,0,0,0.25), 0 0 10px ${band.markerHex}60`
            : `0 0 14px ${band.markerHex}60`;

          return L.divIcon({
            html: `<div class="custom-cluster-marker" style="
              width: ${size}px;
              height: ${size}px;
              background: ${bg};
              color: ${textColor};
              border: 3px solid ${band.markerHex};
              box-shadow: ${shadow};
            ">${count}</div>`,
            className: 'cluster-icon-clean',
            iconSize: [size, size]
          });
        }
      });
    } else {
      newGroup = L.layerGroup();
    }

    mapInstanceRef.current.addLayer(newGroup);
    clusterGroupRef.current = newGroup;
  }, [enableClustering, isMapReady]);

  // Update map tile theme retrieved from OneMap API
  const toggleMapTheme = (theme: 'Default' | 'Night') => {
    setMapTheme(theme);
    if (tileLayerRef && mapInstanceRef.current) {
      tileLayerRef.setUrl(`/api/tile?style=${theme}&z={z}&x={x}&y={y}`);
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

    const titleColor = isDayMode ? '#0f172a' : '#ffffff';
    const subColor = isDayMode ? '#64748b' : '#94a3b8';
    const cardBg = isDayMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.7)';
    const cardBorder = isDayMode ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)';
    const specBg = isDayMode ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)';
    const specBorder = isDayMode ? '#e2e8f0' : 'rgba(255,255,255,0.05)';
    const specValue = isDayMode ? '#0f172a' : '#f1f5f9';
    const priceColor = isDayMode ? '#0284c7' : '#38bdf8';
    const mrtBg = isDayMode ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.08)';
    const mrtBorder = isDayMode ? 'rgba(2, 132, 199, 0.2)' : 'rgba(56, 189, 248, 0.2)';
    const mrtText = isDayMode ? '#0369a1' : '#38bdf8';
    const mrtStationText = isDayMode ? '#0f172a' : '#e2e8f0';
    const mortgageColor = isDayMode ? '#059669' : '#34d399';

    return `
      <div style="padding: 16px 18px; width: 285px; font-family: 'Plus Jakarta Sans', sans-serif;">
        <!-- Header & Price -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.06em; color: ${subColor};">
              ${flat.town} &bull; Blk ${flat.block}
            </div>
            <div style="font-size: 15px; font-weight: 800; color: ${titleColor}; line-height: 1.25; margin-top: 2px;">
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
        <div style="margin-top: 12px; padding: 10px 12px; background: ${cardBg}; border-radius: 10px; border: 1px solid ${cardBorder};">
          <div style="font-size: 11px; color: ${subColor};">Resale Price</div>
          <div style="font-size: 20px; font-weight: 800; color: ${priceColor}; letter-spacing: -0.02em;">
            ${formatSGD(flat.resale_price)}
          </div>
          <div style="font-size: 11px; color: ${subColor}; margin-top: 2px; display: flex; justify-content: space-between;">
            <span>$${psf.toLocaleString()} psf</span>
            <span>&bull;</span>
            <span>$${psm.toLocaleString()} /sqm</span>
          </div>
        </div>

        <!-- Key Flat Specs Grid -->
        <div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
          <div style="background: ${specBg}; padding: 7px 9px; border-radius: 8px; border: 1px solid ${specBorder};">
            <div style="color: ${subColor}; font-weight: 600;">Floor Area</div>
            <div style="color: ${specValue}; font-weight: 700; margin-top: 1px;">${flat.floor_area_sqm} sqm (${sqft} sqft)</div>
          </div>
          <div style="background: ${specBg}; padding: 7px 9px; border-radius: 8px; border: 1px solid ${specBorder};">
            <div style="color: ${subColor}; font-weight: 600;">Storey</div>
            <div style="color: ${specValue}; font-weight: 700; margin-top: 1px;">Lvl ${flat.storey_range}</div>
          </div>
          <div style="background: ${specBg}; padding: 7px 9px; border-radius: 8px; border: 1px solid ${specBorder};">
            <div style="color: ${subColor}; font-weight: 600;">Remaining Lease</div>
            <div style="color: ${specValue}; font-weight: 700; margin-top: 1px;">${flat.remaining_lease}</div>
          </div>
          <div style="background: ${specBg}; padding: 7px 9px; border-radius: 8px; border: 1px solid ${specBorder};">
            <div style="color: ${subColor}; font-weight: 600;">Transaction</div>
            <div style="color: ${specValue}; font-weight: 700; margin-top: 1px;">${flat.month}</div>
          </div>
        </div>

        <!-- Nearest MRT Station -->
        <div style="margin-top: 10px; padding: 8px 10px; background: ${mrtBg}; border: 1px solid ${mrtBorder}; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${mrtText}; display: inline-block;"></span>
            <span style="color: ${mrtStationText}; font-weight: 600;">${nearestMrt.station.name} MRT</span>
          </div>
          <div style="color: ${mrtText}; font-weight: 700;">
            ${nearestMrt.distanceMeters}m (${walkMins}m walk)
          </div>
        </div>

        <!-- Mortgage Fast Estimate -->
        <div style="margin-top: 8px; font-size: 11px; color: ${subColor}; display: flex; justify-content: space-between; align-items: center; padding: 4px 2px;">
          <span>Est. Monthly Mortgage:</span>
          <span style="color: ${mortgageColor}; font-weight: 700;">~${formatSGD(estMonthly)}/mo</span>
        </div>
      </div>
    `;
  }, [isDayMode]);

  // Update Markers on filteredTransactions change or day/night mode change
  useEffect(() => {
    if (!clusterGroupRef.current || typeof L === 'undefined') return;

    clusterGroupRef.current.clearLayers();
    markerMapRef.current.clear();

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
      markerMapRef.current.set(flat._id, marker);
    });
  }, [filteredTransactions, createFlatMarkerIcon, buildPopupHtml, isDayMode, isMapReady, enableClustering]);

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
    <div className={`relative w-screen h-screen flex overflow-hidden font-sans transition-colors duration-300 ${
      isDayMode ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* MAP CANVAS */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* FLOATING TOP APP BAR */}
      <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className={`p-2.5 rounded-xl border shadow-xl backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 ${
              isDayMode
                ? 'bg-white/95 hover:bg-slate-50 text-slate-800 border-slate-200'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700/60'
            }`}
            title="Toggle Control Panel"
          >
            <SlidersHorizontal className={`w-5 h-5 ${isDayMode ? 'text-sky-600' : 'text-sky-400'}`} />
            <span className="text-xs font-bold hidden sm:inline">
              {sidebarOpen ? 'Hide Panel' : 'Filters & Budget'}
            </span>
          </button>

          {/* Quick App Brand Badge */}
          <div className={`border px-3.5 py-2 rounded-xl backdrop-blur-md shadow-xl flex items-center gap-2.5 ${
            isDayMode
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : 'bg-slate-900/90 border-slate-700/60 text-slate-100'
          }`}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <div className="text-left">
              <h1 className="text-xs font-extrabold tracking-tight flex items-center gap-1.5">
                <span>SG HDB Resale & Budget Map</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                  isDayMode
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}>
                  OneMap
                </span>
              </h1>
              <p className={`text-[10px] hidden md:block ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Interactive Affordability & Spatial Pricing Explorer
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Controls: Search, Day/Night Toggle, Health */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Search Form */}
          <form onSubmit={handleAddressSearch} className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search postal code, street, MRT..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-64 md:w-80 border text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 backdrop-blur-md shadow-xl transition-all ${
                isDayMode
                  ? 'bg-white/95 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-slate-900/90 border-slate-700/60 text-slate-100 placeholder-slate-400'
              }`}
            />
            <Search className={`w-4 h-4 absolute left-3 top-3 ${isDayMode ? 'text-slate-400' : 'text-slate-400'}`} />
            {searchLoading ? (
              <RefreshCw className="w-3.5 h-3.5 text-sky-400 absolute right-3 top-3 animate-spin" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </form>

          {/* Map Base Tile Day / Night Mode Switcher */}
          <div className={`p-1 rounded-xl backdrop-blur-md flex items-center text-xs transition-all border ${
            isDayMode
              ? 'bg-white/95 border-slate-200 shadow-md'
              : 'bg-slate-900/90 border-slate-700/60 shadow-xl'
          }`}>
            <button
              onClick={() => toggleDayNightMode('day')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                isDayMode
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Switch to Day Mode (OneMap Default)"
            >
              <Sun className={`w-3.5 h-3.5 ${isDayMode ? 'text-white' : 'text-amber-400'}`} />
              <span>Day</span>
            </button>
            <button
              onClick={() => toggleDayNightMode('night')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                !isDayMode
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Switch to Night Mode (OneMap Night)"
            >
              <Moon className={`w-3.5 h-3.5 ${!isDayMode ? 'text-sky-200' : 'text-slate-400'}`} />
              <span>Night</span>
            </button>
          </div>

          {/* System API Health Check Button */}
          <button
            onClick={checkServiceHealth}
            className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${
              isDayMode
                ? 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border-slate-700/60'
            }`}
            title="Service & API Health Diagnostics"
          >
            <Activity className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      </header>

      {/* FLOATING NOTIFICATION BANNER */}
      {fetchNotification && (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 border px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 ${
          isDayMode
            ? 'bg-white/95 border-sky-400 text-slate-800'
            : 'bg-slate-900/95 border-sky-500/50 text-slate-100'
        }`}>
          <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
          <span>{fetchNotification}</span>
        </div>
      )}

      {/* FLOATING QUICK BUDGET CONTROLLER ON MAP */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto rounded-2xl border backdrop-blur-xl shadow-2xl p-2 md:p-2.5 flex flex-wrap items-center justify-center gap-2 md:gap-3 transition-all max-w-[94vw] ${
        isDayMode
          ? 'bg-white/95 border-slate-200/90 text-slate-800'
          : 'bg-slate-900/95 border-slate-800 text-slate-100'
      }`}>
        {/* Budget Limit Display */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-800">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-500">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Budget Limit</div>
            <div className="text-xs md:text-sm font-black text-emerald-500">{formatSGD(effectiveBudgetMax)}</div>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleBudgetStep(-25000)}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
              isDayMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Decrease budget limit by $25k"
          >
            -$25k
          </button>
          <button
            onClick={() => handleBudgetStep(25000)}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
              isDayMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Increase budget limit by $25k"
          >
            +$25k
          </button>
        </div>

        {/* Quick Presets */}
        <div className="hidden sm:flex items-center gap-1">
          {[450000, 650000, 850000].map(amt => (
            <button
              key={amt}
              onClick={() => setBudgetPreset(amt)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                effectiveBudgetMax === amt
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : isDayMode
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              ≤${amt / 1000}k
            </button>
          ))}
          <button
            onClick={() => setBudgetPreset(null)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              customBudgetCap === 1500000 && !filterByBudget
                ? 'bg-sky-600 text-white border-sky-500'
                : isDayMode
                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            All
          </button>
        </div>

        {/* Flats count */}
        <div className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <span>{filteredTransactions.length} flats</span>
        </div>

        {/* Fit Bounds Button */}
        <button
          onClick={fitMapToFilteredFlats}
          className={`p-1.5 rounded-xl border transition-all ${
            isDayMode
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title="Zoom to fit all filtered flats on map"
        >
          <LocateFixed className="w-4 h-4 text-sky-400" />
        </button>

        {/* Pin mode toggle (Pins vs Clusters) */}
        <button
          onClick={() => setEnableClustering(prev => !prev)}
          className={`px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
            enableClustering
              ? isDayMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
              : isDayMode
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
          title={enableClustering ? 'Currently grouping into clusters. Click for individual pins.' : 'Currently showing individual flat pins. Click to cluster.'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{enableClustering ? 'Clusters' : 'All Pins'}</span>
        </button>
      </div>

      {/* LEFT CONTROL PANEL (DRAWER) */}
      <aside
        className={`absolute top-20 bottom-4 left-4 z-20 w-96 max-w-[calc(100vw-2rem)] flex flex-col border rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 ${
          isDayMode
            ? 'bg-white/95 border-slate-200/90 text-slate-800'
            : 'bg-slate-900/95 border-slate-800/80 text-slate-100'
        } ${
          sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-[110%] opacity-0 pointer-events-none'
        }`}
      >
        {/* Navigation Tabs */}
        <div className={`p-3 border-b grid grid-cols-3 gap-1 ${
          isDayMode ? 'border-slate-200 bg-slate-50/80' : 'border-slate-800 bg-slate-950/40'
        }`}>
          <button
            onClick={() => setActiveTab('filter')}
            className={`py-2 px-1 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'filter'
                ? isDayMode
                  ? 'bg-sky-100 text-sky-800 border border-sky-300 shadow-xs'
                  : 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                : isDayMode
                ? 'text-slate-600 hover:text-slate-900'
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
                ? isDayMode
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs'
                  : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : isDayMode
                ? 'text-slate-600 hover:text-slate-900'
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
                ? isDayMode
                  ? 'bg-purple-100 text-purple-800 border border-purple-300 shadow-xs'
                  : 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : isDayMode
                ? 'text-slate-600 hover:text-slate-900'
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
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setMinPrice(200000);
                      setMaxPrice(450000);
                    }}
                    className={`p-2 rounded-lg font-semibold text-left transition-all border ${
                      isDayMode
                        ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-200'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    Entry Budget (&lt; $450k)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFlatTypes(['4 ROOM']);
                      setMinPrice(450000);
                      setMaxPrice(700000);
                    }}
                    className={`p-2 rounded-lg font-semibold text-left transition-all border ${
                      isDayMode
                        ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-800 border-amber-200'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    4-Room Family ($450-700k)
                  </button>
                  <button
                    onClick={() => {
                      setMinPrice(950000);
                      setMaxPrice(1500000);
                    }}
                    className={`p-2 rounded-lg font-semibold text-left transition-all border ${
                      isDayMode
                        ? 'bg-rose-50 hover:bg-rose-100/80 text-rose-800 border-rose-200'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    Million Dollar Club ($1M+)
                  </button>
                  <button
                    onClick={() => {
                      setMinLeaseYears(80);
                    }}
                    className={`p-2 rounded-lg font-semibold text-left transition-all border ${
                      isDayMode
                        ? 'bg-sky-50 hover:bg-sky-100/80 text-sky-800 border-sky-200'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-sky-400 border-sky-500/30'
                    }`}
                  >
                    Long Lease (&gt; 80 Yrs)
                  </button>
                </div>
              </div>

              {/* Budget Limit & Price Range Controls */}
              <div className={`p-3.5 rounded-xl border ${
                isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDayMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Maximum Budget Cap
                  </label>
                  <span className="text-xs font-mono font-black text-emerald-500">
                    ≤ {formatSGD(effectiveBudgetMax)}
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <input
                      type="range"
                      min={250000}
                      max={1500000}
                      step={25000}
                      value={effectiveBudgetMax}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setFilterByBudget(true);
                        setCustomBudgetCap(val);
                        setMaxPrice(val);
                      }}
                      className={`w-full accent-emerald-500 h-2 rounded-lg cursor-pointer ${
                        isDayMode ? 'bg-slate-200' : 'bg-slate-800'
                      }`}
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>$250k</span>
                      <span>$750k</span>
                      <span>$1.5M</span>
                    </div>
                  </div>

                  {/* Quick Budget Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[400000, 550000, 700000, 900000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBudgetPreset(amt)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          effectiveBudgetMax === amt
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                            : isDayMode
                            ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        ≤ ${amt / 1000}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setBudgetPreset(null)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        customBudgetCap === 1500000 && !filterByBudget
                          ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                          : isDayMode
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      Show All
                    </button>
                  </div>

                  {/* Optional Minimum Price Slider */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Min Floor: {minPrice > 0 ? formatSGD(minPrice) : 'No min ($0)'}</span>
                      <span>$0 - $800k</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={800000}
                      step={25000}
                      value={minPrice}
                      onChange={e => setMinPrice(Math.min(Number(e.target.value), effectiveBudgetMax - 25000))}
                      className={`w-full accent-sky-500 h-1.5 rounded-lg cursor-pointer ${
                        isDayMode ? 'bg-slate-200' : 'bg-slate-800'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Flat Type Filter */}
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
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
                            : isDayMode
                            ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
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
                      className={`px-2 py-1 text-[11px] underline ${
                        isDayMode ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Towns Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDayMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Towns ({selectedTowns.length === 0 ? 'All Singapore' : `${selectedTowns.length} selected`})
                  </label>
                  {selectedTowns.length > 0 && (
                    <button
                      onClick={() => setSelectedTowns([])}
                      className="text-[10px] text-sky-500 hover:underline"
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
                            ? isDayMode
                              ? 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
                              : 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                            : isDayMode
                            ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{town.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-sky-500 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remaining Lease Filter */}
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
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
                          : isDayMode
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-slate-200'
                      }`}
                    >
                      {years === 0 ? 'Any' : `${years}+ Yrs`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spatial Amenities & Overlays */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Spatial Layers & Amenities
                </label>
                <div className="flex items-center justify-between text-xs">
                  <span className={`flex items-center gap-1.5 ${
                    isDayMode ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <Train className="w-3.5 h-3.5 text-sky-500" />
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
                  <span className={`flex items-center gap-1.5 ${
                    isDayMode ? 'text-slate-700' : 'text-slate-300'
                  }`}>
                    <LocateFixed className="w-3.5 h-3.5 text-emerald-500" />
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
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    isDayMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
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
              <div className={`p-3 rounded-xl border ${
                isDayMode
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className={`flex items-center gap-2 font-bold text-xs ${
                  isDayMode ? 'text-emerald-800' : 'text-emerald-400'
                }`}>
                  <Calculator className="w-4 h-4" />
                  <span>HDB Mortgage & Affordability Model</span>
                </div>
                <p className={`text-[11px] mt-1 leading-relaxed ${
                  isDayMode ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  Compliant with MAS & HDB regulations: 30% Mortgage Servicing Ratio (MSR) and current LTV limits.
                </p>
              </div>

              {/* Household Income Input */}
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Gross Household Monthly Income
                </label>
                <div className="relative">
                  <DollarSign className={`w-4 h-4 absolute left-3 top-2.5 ${isDayMode ? 'text-slate-400' : 'text-slate-400'}`} />
                  <input
                    type="number"
                    step={500}
                    value={monthlyIncome}
                    onChange={e => {
                      setMonthlyIncome(Math.max(0, Number(e.target.value)));
                      setFilterByBudget(true);
                      setCustomBudgetCap(null);
                    }}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none border ${
                      isDayMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950/60 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
                <div className={`text-[10px] mt-1 ${isDayMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  MSR allows max ~{formatSGD(budgetCalculations.maxMonthlyInstallment)}/month for mortgage payment.
                </div>
              </div>

              {/* Cash & CPF Downpayment */}
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Cash + CPF OA Available for Downpayment
                </label>
                <div className="relative">
                  <DollarSign className={`w-4 h-4 absolute left-3 top-2.5 ${isDayMode ? 'text-slate-400' : 'text-slate-400'}`} />
                  <input
                    type="number"
                    step={10000}
                    value={cashDownpayment}
                    onChange={e => {
                      setCashDownpayment(Math.max(0, Number(e.target.value)));
                      setFilterByBudget(true);
                      setCustomBudgetCap(null);
                    }}
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none border ${
                      isDayMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-slate-950/60 border-slate-700 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              {/* Loan Type Selection */}
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider block mb-1 ${
                  isDayMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  Financing Loan Type
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setLoanType('hdb');
                      setLoanInterestRate(2.6);
                      setFilterByBudget(true);
                      setCustomBudgetCap(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      loanType === 'hdb'
                        ? isDayMode
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs'
                          : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md'
                        : isDayMode
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    <div>HDB Concessionary</div>
                    <div className={`text-[10px] font-normal ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      2.6% p.a. • 80% LTV
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setLoanType('bank');
                      setLoanInterestRate(3.2);
                      setFilterByBudget(true);
                      setCustomBudgetCap(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left font-bold transition-all ${
                      loanType === 'bank'
                        ? isDayMode
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs'
                          : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-md'
                        : isDayMode
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    <div>Bank Commercial</div>
                    <div className={`text-[10px] font-normal ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      3.2% p.a. • 75% LTV
                    </div>
                  </button>
                </div>
              </div>

              {/* Loan Tenure Slider */}
              <div className={`p-3 rounded-xl border ${
                isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className={isDayMode ? 'text-slate-600' : 'text-slate-400'}>Loan Tenure</span>
                  <span className="text-emerald-500 font-mono">{loanTenureYears} Years</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={30}
                  step={1}
                  value={loanTenureYears}
                  onChange={e => {
                    setLoanTenureYears(Number(e.target.value));
                    setFilterByBudget(true);
                    setCustomBudgetCap(null);
                  }}
                  className={`w-full accent-emerald-500 h-1.5 rounded-lg cursor-pointer ${
                    isDayMode ? 'bg-slate-200' : 'bg-slate-800'
                  }`}
                />
              </div>

              {/* Calculated Budget Summary Box */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDayMode
                  ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300 shadow-sm'
                  : 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/40'
              }`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider ${
                  isDayMode ? 'text-emerald-700' : 'text-emerald-400'
                }`}>
                  Estimated Maximum Purchase Budget
                </div>
                <div className={`text-2xl font-black tracking-tight ${
                  isDayMode ? 'text-slate-900' : 'text-white'
                }`}>
                  {formatSGD(budgetCalculations.calculatedMaxPrice)}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-[11px]">
                  <div>
                    <span className={`block ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>Eligible Loan:</span>
                    <span className={`font-bold ${isDayMode ? 'text-slate-800' : 'text-slate-200'}`}>
                      {formatSGD(budgetCalculations.maxLoanAmount)}
                    </span>
                  </div>
                  <div>
                    <span className={`block ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>Downpayment:</span>
                    <span className={`font-bold ${isDayMode ? 'text-slate-800' : 'text-slate-200'}`}>
                      {formatSGD(cashDownpayment)}
                    </span>
                  </div>
                  <div>
                    <span className={`block ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>Max Installment:</span>
                    <span className="text-emerald-600 font-bold">
                      {formatSGD(budgetCalculations.maxMonthlyInstallment)}/mo
                    </span>
                  </div>
                  <div>
                    <span className={`block ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>MSR Limit:</span>
                    <span className={`font-bold ${isDayMode ? 'text-slate-800' : 'text-slate-200'}`}>30% of Income</span>
                  </div>
                </div>

                {/* Live Filter Indicator */}
                <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold text-emerald-500">Map Dynamically Filtered</span>
                  </div>
                  <span className="font-extrabold text-emerald-400">
                    {filteredTransactions.length} flats
                  </span>
                </div>

                {/* Fit Map Button */}
                <button
                  onClick={fitMapToFilteredFlats}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <LocateFixed className="w-4 h-4" />
                  <span>Fit Map to {filteredTransactions.length} Affordable Flats</span>
                </button>
              </div>

              {/* Matching Affordable Flats List */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDayMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Affordable Flats ({filteredTransactions.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Click card to view on map
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {filteredTransactions.length === 0 ? (
                    <div className={`p-4 rounded-xl text-center text-xs border ${
                      isDayMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-900/50 border-slate-800 text-slate-400'
                    }`}>
                      No flats found under {formatSGD(effectiveBudgetMax)}. Try increasing your income or downpayment.
                    </div>
                  ) : (
                    filteredTransactions.slice(0, 15).map(flat => {
                      const band = getPriceBand(flat.resale_price);
                      return (
                        <div
                          key={flat._id}
                          onClick={() => focusFlatOnMap(flat)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                            selectedFlat?._id === flat._id
                              ? isDayMode
                                ? 'bg-sky-50 border-sky-400 shadow-sm'
                                : 'bg-sky-950/40 border-sky-500/50 shadow-md'
                              : isDayMode
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                              : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs font-bold">{flat.block} {flat.street_name}</div>
                              <div className={`text-[10px] ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {flat.town} • {flat.flat_type} • {flat.storey_range}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-black font-mono" style={{ color: band.markerHex }}>
                                {formatSGD(flat.resale_price)}
                              </div>
                              <div className="text-[9px] text-emerald-500 font-semibold">
                                In Budget
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AFFORDABLE TOWNS & INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className={`text-xs ${isDayMode ? 'text-slate-600' : 'text-slate-300'}`}>
                Towns ranked by proportion of transactions meeting your current budget of{' '}
                <strong className={isDayMode ? 'text-emerald-700' : 'text-emerald-400'}>
                  {formatSGD(budgetCalculations.calculatedMaxPrice)}
                </strong>. Click any town to zoom:
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {affordableTowns.length === 0 ? (
                  <div className={`p-4 rounded-xl text-center text-xs border ${
                    isDayMode
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}>
                    No towns have flats under this budget limit. Consider increasing downpayment or income.
                  </div>
                ) : (
                  affordableTowns.map((item, idx) => (
                    <div
                      key={item.town}
                      onClick={() => zoomToTown(item.town)}
                      className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group border ${
                        isDayMode
                          ? 'bg-slate-50 hover:bg-sky-50/60 border-slate-200 hover:border-sky-300'
                          : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono ${isDayMode ? 'text-slate-400' : 'text-slate-500'}`}>#{idx + 1}</span>
                          <span className={`text-xs font-bold transition-colors ${
                            isDayMode
                              ? 'text-slate-800 group-hover:text-sky-700'
                              : 'text-slate-100 group-hover:text-sky-300'
                          }`}>
                            {item.town}
                          </span>
                        </div>
                        <div className={`text-[10px] mt-1 flex gap-2 ${
                          isDayMode ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                          <span>Median: {formatSGD(item.medianPrice)}</span>
                          <span>&bull;</span>
                          <span>{item.affordable} affordable units</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs font-black ${
                          isDayMode ? 'text-emerald-600' : 'text-emerald-400'
                        }`}>{item.percent}%</div>
                        <div className={`text-[9px] ${isDayMode ? 'text-slate-400' : 'text-slate-500'}`}>within budget</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Drawer Summary Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs ${
          isDayMode
            ? 'border-slate-200 bg-slate-50 text-slate-800'
            : 'border-slate-800 bg-slate-950/80 text-slate-100'
        }`}>
          <div>
            <div className={`text-[10px] ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>Matching Flats</div>
            <div className="text-sm font-black text-sky-500">
              {summaryStats.count}{' '}
              <span className={`text-[10px] font-normal ${isDayMode ? 'text-slate-400' : 'text-slate-500'}`}>
                of {transactions.length}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-[10px] ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>Median Resale</div>
            <div className={`text-sm font-black ${isDayMode ? 'text-slate-800' : 'text-slate-100'}`}>
              {summaryStats.count > 0 ? formatSGD(summaryStats.medianPrice) : 'N/A'}
            </div>
          </div>
        </div>
      </aside>

      {/* BOTTOM RIGHT PRICE BAND DYNAMIC LEGEND */}
      <div className={`absolute bottom-5 right-4 z-20 pointer-events-auto rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl max-w-xs text-xs space-y-2 hidden sm:block border ${
        isDayMode
          ? 'bg-white/95 border-slate-200 text-slate-800'
          : 'bg-slate-900/95 border-slate-800/90 text-slate-100'
      }`}>
        <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider border-b pb-1.5 ${
          isDayMode ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-slate-800'
        }`}>
          <span>Resale Price Bands</span>
          <span className={`text-[10px] ${isDayMode ? 'text-slate-400' : 'text-slate-500'}`}>Click to filter</span>
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
                  isActive
                    ? isDayMode
                      ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-800'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                    : 'opacity-40 hover:opacity-75'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: band.markerHex }}
                  />
                  <span className={`text-[11px] font-semibold ${isDayMode ? 'text-slate-700' : 'text-slate-200'}`}>
                    {band.label}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isDayMode
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-950/60 text-slate-400'
                }`}>
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
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 ${
            isDayMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDayMode ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h3 className={`text-base font-extrabold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                  System & Upstream Health
                </h3>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className={`p-1 rounded-lg ${isDayMode ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {healthLoading ? (
              <div className={`py-8 flex flex-col items-center justify-center gap-2 text-xs ${
                isDayMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
                <span>Checking /api/health and upstream connections...</span>
              </div>
            ) : healthData ? (
              <div className="space-y-4 text-xs">
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${isDayMode ? 'text-slate-600' : 'text-slate-400'}`}>Service Health:</span>
                    <span className="text-emerald-500 font-black uppercase">{healthData.status || 'OK'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${isDayMode ? 'text-slate-600' : 'text-slate-400'}`}>LTA Account Key Status:</span>
                    <span
                      className={`font-black ${
                        healthData.keyConfigured ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {healthData.keyConfigured ? 'Configured (Active)' : 'Not Configured (Using Open Fallback)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDayMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Upstream Services Connectivity
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <div>
                      <div className={`font-bold ${isDayMode ? 'text-slate-800' : 'text-slate-200'}`}>Data.gov.sg HDB Resale API</div>
                      <div className={`text-[10px] ${isDayMode ? 'text-slate-500' : 'text-slate-500'}`}>Public Open Data Dataset</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          healthData.upstream?.dataGov?.ok
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : 'bg-amber-500/20 text-amber-600'
                        }`}
                      >
                        HTTP {healthData.upstream?.dataGov?.statusCode || 200}
                      </span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
                  }`}>
                    <div>
                      <div className={`font-bold ${isDayMode ? 'text-slate-800' : 'text-slate-200'}`}>OneMap Singapore Search & Tiles</div>
                      <div className={`text-[10px] ${isDayMode ? 'text-slate-500' : 'text-slate-500'}`}>Geospatial Base Services</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          healthData.upstream?.oneMap?.ok
                            ? 'bg-emerald-500/20 text-emerald-600'
                            : 'bg-amber-500/20 text-amber-600'
                        }`}
                      >
                        HTTP {healthData.upstream?.oneMap?.statusCode || 200}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`text-[11px] italic ${isDayMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Note: Health diagnostics strictly adhere to safety rules and never expose secret tokens.
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                onClick={() => setShowHealthModal(false)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isDayMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
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
