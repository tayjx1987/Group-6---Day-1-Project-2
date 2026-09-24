export interface HdbTransaction {
  _id: string | number;
  month: string;
  town: string;
  flat_type: string;
  block: string;
  street_name: string;
  storey_range: string;
  floor_area_sqm: number;
  flat_model: string;
  lease_commence_date: string;
  remaining_lease: string;
  resale_price: number;
  lat: number;
  lng: number;
}

export interface TownInfo {
  name: string;
  lat: number;
  lng: number;
  region: 'North' | 'North-East' | 'East' | 'West' | 'Central';
  medianPrice: number;
}

export interface MrtStation {
  name: string;
  code: string;
  lines: string[];
  lat: number;
  lng: number;
}

export const SINGAPORE_TOWNS: TownInfo[] = [
  { name: 'ANG MO KIO', lat: 1.3691, lng: 103.8454, region: 'North-East', medianPrice: 480000 },
  { name: 'BEDOK', lat: 1.3236, lng: 103.9273, region: 'East', medianPrice: 460000 },
  { name: 'BISHAN', lat: 1.3526, lng: 103.8352, region: 'Central', medianPrice: 720000 },
  { name: 'BUKIT BATOK', lat: 1.3590, lng: 103.7497, region: 'West', medianPrice: 470000 },
  { name: 'BUKIT MERAH', lat: 1.2819, lng: 103.8239, region: 'Central', medianPrice: 760000 },
  { name: 'BUKIT PANJANG', lat: 1.3774, lng: 103.7719, region: 'West', medianPrice: 490000 },
  { name: 'BUKIT TIMAH', lat: 1.3294, lng: 103.7763, region: 'Central', medianPrice: 810000 },
  { name: 'CENTRAL AREA', lat: 1.2789, lng: 103.8437, region: 'Central', medianPrice: 880000 },
  { name: 'CHOA CHU KANG', lat: 1.3840, lng: 103.7470, region: 'West', medianPrice: 485000 },
  { name: 'CLEMENTI', lat: 1.3162, lng: 103.7649, region: 'West', medianPrice: 650000 },
  { name: 'GEYLANG', lat: 1.3201, lng: 103.8918, region: 'Central', medianPrice: 530000 },
  { name: 'HOUGANG', lat: 1.3712, lng: 103.8915, region: 'North-East', medianPrice: 510000 },
  { name: 'JURONG EAST', lat: 1.3329, lng: 103.7436, region: 'West', medianPrice: 520000 },
  { name: 'JURONG WEST', lat: 1.3404, lng: 103.7090, region: 'West', medianPrice: 465000 },
  { name: 'KALLANG/WHAMPOA', lat: 1.3100, lng: 103.8651, region: 'Central', medianPrice: 680000 },
  { name: 'MARINE PARADE', lat: 1.3020, lng: 103.9073, region: 'East', medianPrice: 580000 },
  { name: 'PASIR RIS', lat: 1.3721, lng: 103.9474, region: 'East', medianPrice: 560000 },
  { name: 'PUNGGOL', lat: 1.4043, lng: 103.9022, region: 'North-East', medianPrice: 590000 },
  { name: 'QUEENSTOWN', lat: 1.2942, lng: 103.8060, region: 'Central', medianPrice: 790000 },
  { name: 'SEMBAWANG', lat: 1.4491, lng: 103.8185, region: 'North', medianPrice: 460000 },
  { name: 'SENGKANG', lat: 1.3868, lng: 103.8914, region: 'North-East', medianPrice: 540000 },
  { name: 'SERANGOON', lat: 1.3554, lng: 103.8679, region: 'North-East', medianPrice: 580000 },
  { name: 'TAMPINES', lat: 1.3524, lng: 103.9447, region: 'East', medianPrice: 560000 },
  { name: 'TOA PAYOH', lat: 1.3343, lng: 103.8563, region: 'Central', medianPrice: 640000 },
  { name: 'WOODLANDS', lat: 1.4382, lng: 103.7891, region: 'North', medianPrice: 450000 },
  { name: 'YISHUN', lat: 1.4304, lng: 103.8354, region: 'North', medianPrice: 455000 }
];

export const MRT_STATIONS: MrtStation[] = [
  // North-South Line (Red)
  { name: 'Jurong East', code: 'NS1/EW24', lines: ['NS', 'EW'], lat: 1.3331, lng: 103.7423 },
  { name: 'Bukit Batok', code: 'NS2', lines: ['NS'], lat: 1.3490, lng: 103.7496 },
  { name: 'Bukit Gombak', code: 'NS3', lines: ['NS'], lat: 1.3587, lng: 103.7519 },
  { name: 'Choa Chu Kang', code: 'NS4', lines: ['NS', 'BP'], lat: 1.3854, lng: 103.7443 },
  { name: 'Yew Tee', code: 'NS5', lines: ['NS'], lat: 1.3973, lng: 103.7474 },
  { name: 'Woodlands', code: 'NS9/TE2', lines: ['NS', 'TE'], lat: 1.4369, lng: 103.7865 },
  { name: 'Admiralty', code: 'NS10', lines: ['NS'], lat: 1.4406, lng: 103.8010 },
  { name: 'Sembawang', code: 'NS11', lines: ['NS'], lat: 1.4491, lng: 103.8201 },
  { name: 'Yishun', code: 'NS13', lines: ['NS'], lat: 1.4294, lng: 103.8350 },
  { name: 'Khatib', code: 'NS14', lines: ['NS'], lat: 1.4174, lng: 103.8329 },
  { name: 'Yio Chu Kang', code: 'NS15', lines: ['NS'], lat: 1.3817, lng: 103.8449 },
  { name: 'Ang Mo Kio', code: 'NS16', lines: ['NS'], lat: 1.3699, lng: 103.8496 },
  { name: 'Bishan', code: 'NS17/CC15', lines: ['NS', 'CC'], lat: 1.3508, lng: 103.8481 },
  { name: 'Braddell', code: 'NS18', lines: ['NS'], lat: 1.3405, lng: 103.8468 },
  { name: 'Toa Payoh', code: 'NS19', lines: ['NS'], lat: 1.3327, lng: 103.8476 },
  { name: 'Novena', code: 'NS20', lines: ['NS'], lat: 1.3204, lng: 103.8438 },
  { name: 'Newton', code: 'NS21/DT11', lines: ['NS', 'DT'], lat: 1.3123, lng: 103.8380 },
  { name: 'Orchard', code: 'NS22/TE14', lines: ['NS', 'TE'], lat: 1.3040, lng: 103.8318 },
  { name: 'Dhoby Ghaut', code: 'NS24/NE6/CC1', lines: ['NS', 'NE', 'CC'], lat: 1.2989, lng: 103.8458 },
  { name: 'City Hall', code: 'NS25/EW13', lines: ['NS', 'EW'], lat: 1.2931, lng: 103.8521 },
  { name: 'Raffles Place', code: 'NS26/EW14', lines: ['NS', 'EW'], lat: 1.2830, lng: 103.8513 },

  // East-West Line (Green)
  { name: 'Pasir Ris', code: 'EW1', lines: ['EW'], lat: 1.3730, lng: 103.9493 },
  { name: 'Tampines', code: 'EW2/DT32', lines: ['EW', 'DT'], lat: 1.3533, lng: 103.9452 },
  { name: 'Simei', code: 'EW3', lines: ['EW'], lat: 1.3432, lng: 103.9533 },
  { name: 'Tanah Merah', code: 'EW4', lines: ['EW'], lat: 1.3272, lng: 103.9465 },
  { name: 'Bedok', code: 'EW5', lines: ['EW'], lat: 1.3240, lng: 103.9300 },
  { name: 'Kembangan', code: 'EW6', lines: ['EW'], lat: 1.3210, lng: 103.9129 },
  { name: 'Eunos', code: 'EW7', lines: ['EW'], lat: 1.3197, lng: 103.9032 },
  { name: 'Paya Lebar', code: 'EW8/CC9', lines: ['EW', 'CC'], lat: 1.3178, lng: 103.8924 },
  { name: 'Aljunied', code: 'EW9', lines: ['EW'], lat: 1.3164, lng: 103.8829 },
  { name: 'Kallang', code: 'EW10', lines: ['EW'], lat: 1.3115, lng: 103.8714 },
  { name: 'Lavender', code: 'EW11', lines: ['EW'], lat: 1.3074, lng: 103.8628 },
  { name: 'Bugis', code: 'EW12/DT14', lines: ['EW', 'DT'], lat: 1.3005, lng: 103.8559 },
  { name: 'Tanjong Pagar', code: 'EW15', lines: ['EW'], lat: 1.2764, lng: 103.8457 },
  { name: 'Outram Park', code: 'EW16/NE3/TE17', lines: ['EW', 'NE', 'TE'], lat: 1.2804, lng: 103.8395 },
  { name: 'Tiong Bahru', code: 'EW17', lines: ['EW'], lat: 1.2865, lng: 103.8269 },
  { name: 'Redhill', code: 'EW18', lines: ['EW'], lat: 1.2896, lng: 103.8168 },
  { name: 'Queenstown', code: 'EW19', lines: ['EW'], lat: 1.2949, lng: 103.8058 },
  { name: 'Commonwealth', code: 'EW20', lines: ['EW'], lat: 1.3025, lng: 103.7983 },
  { name: 'Buona Vista', code: 'EW21/CC22', lines: ['EW', 'CC'], lat: 1.3073, lng: 103.7900 },
  { name: 'Dover', code: 'EW22', lines: ['EW'], lat: 1.3114, lng: 103.7786 },
  { name: 'Clementi', code: 'EW23', lines: ['EW'], lat: 1.3151, lng: 103.7652 },
  { name: 'Chinese Garden', code: 'EW25', lines: ['EW'], lat: 1.3424, lng: 103.7326 },
  { name: 'Lakeside', code: 'EW26', lines: ['EW'], lat: 1.3442, lng: 103.7209 },
  { name: 'Boon Lay', code: 'EW27', lines: ['EW'], lat: 1.3386, lng: 103.7060 },
  { name: 'Pioneer', code: 'EW28', lines: ['EW'], lat: 1.3376, lng: 103.6973 },

  // North-East Line (Purple)
  { name: 'HarbourFront', code: 'NE1/CC29', lines: ['NE', 'CC'], lat: 1.2653, lng: 103.8219 },
  { name: 'Chinatown', code: 'NE4/DT19', lines: ['NE', 'DT'], lat: 1.2844, lng: 103.8440 },
  { name: 'Clarke Quay', code: 'NE5', lines: ['NE'], lat: 1.2884, lng: 103.8466 },
  { name: 'Little India', code: 'NE7/DT12', lines: ['NE', 'DT'], lat: 1.3068, lng: 103.8492 },
  { name: 'Farrer Park', code: 'NE8', lines: ['NE'], lat: 1.3123, lng: 103.8542 },
  { name: 'Boon Keng', code: 'NE9', lines: ['NE'], lat: 1.3194, lng: 103.8617 },
  { name: 'Potong Pasir', code: 'NE10', lines: ['NE'], lat: 1.3314, lng: 103.8691 },
  { name: 'Woodleigh', code: 'NE11', lines: ['NE'], lat: 1.3392, lng: 103.8708 },
  { name: 'Serangoon', code: 'NE12/CC13', lines: ['NE', 'CC'], lat: 1.3498, lng: 103.8736 },
  { name: 'Kovan', code: 'NE13', lines: ['NE'], lat: 1.3601, lng: 103.8850 },
  { name: 'Hougang', code: 'NE14', lines: ['NE'], lat: 1.3713, lng: 103.8924 },
  { name: 'Buangkok', code: 'NE15', lines: ['NE'], lat: 1.3829, lng: 103.8931 },
  { name: 'Sengkang', code: 'NE16', lines: ['NE'], lat: 1.3917, lng: 103.8955 },
  { name: 'Punggol', code: 'NE17/CP4', lines: ['NE'], lat: 1.4052, lng: 103.9022 },

  // Circle Line (Orange) & Downtown Line (Blue)
  { name: 'MacPherson', code: 'CC10/DT26', lines: ['CC', 'DT'], lat: 1.3259, lng: 103.8900 },
  { name: 'Tai Seng', code: 'CC11', lines: ['CC'], lat: 1.3355, lng: 103.8879 },
  { name: 'Bartley', code: 'CC12', lines: ['CC'], lat: 1.3426, lng: 103.8802 },
  { name: 'Lorong Chuan', code: 'CC14', lines: ['CC'], lat: 1.3516, lng: 103.8641 },
  { name: 'Marymount', code: 'CC16', lines: ['CC'], lat: 1.3487, lng: 103.8394 },
  { name: 'Caldecott', code: 'CC17/TE9', lines: ['CC', 'TE'], lat: 1.3377, lng: 103.8398 },
  { name: 'Botanic Gardens', code: 'CC19/DT9', lines: ['CC', 'DT'], lat: 1.3223, lng: 103.8153 },
  { name: 'Bukit Panjang', code: 'DT1', lines: ['DT', 'BP'], lat: 1.3789, lng: 103.7618 }
];

export const INITIAL_TRANSACTIONS: HdbTransaction[] = [
  // ANG MO KIO
  {
    _id: 'amk-1',
    month: '2024-05',
    town: 'ANG MO KIO',
    flat_type: '3 ROOM',
    block: '406',
    street_name: 'ANG MO KIO AVE 10',
    storey_range: '10 TO 12',
    floor_area_sqm: 68,
    flat_model: 'New Generation',
    lease_commence_date: '1979',
    remaining_lease: '54 years 03 months',
    resale_price: 388000,
    lat: 1.3621,
    lng: 103.8560
  },
  {
    _id: 'amk-2',
    month: '2024-05',
    town: 'ANG MO KIO',
    flat_type: '4 ROOM',
    block: '310B',
    street_name: 'ANG MO KIO AVE 1',
    storey_range: '19 TO 21',
    floor_area_sqm: 93,
    flat_model: 'Model A',
    lease_commence_date: '2012',
    remaining_lease: '86 years 09 months',
    resale_price: 760000,
    lat: 1.3653,
    lng: 103.8475
  },
  {
    _id: 'amk-3',
    month: '2024-04',
    town: 'ANG MO KIO',
    flat_type: '5 ROOM',
    block: '588C',
    street_name: 'ANG MO KIO ST 52',
    storey_range: '25 TO 27',
    floor_area_sqm: 112,
    flat_model: 'DBSS',
    lease_commence_date: '2011',
    remaining_lease: '85 years 10 months',
    resale_price: 1038000,
    lat: 1.3708,
    lng: 103.8530
  },
  {
    _id: 'amk-4',
    month: '2024-06',
    town: 'ANG MO KIO',
    flat_type: '2 ROOM',
    block: '123',
    street_name: 'ANG MO KIO AVE 6',
    storey_range: '04 TO 06',
    floor_area_sqm: 45,
    flat_model: 'Improved',
    lease_commence_date: '1978',
    remaining_lease: '52 years 11 months',
    resale_price: 260000,
    lat: 1.3732,
    lng: 103.8441
  },

  // BISHAN
  {
    _id: 'bsh-1',
    month: '2024-05',
    town: 'BISHAN',
    flat_type: '4 ROOM',
    block: '173',
    street_name: 'BISHAN ST 13',
    storey_range: '07 TO 09',
    floor_area_sqm: 103,
    flat_model: 'Simplified',
    lease_commence_date: '1987',
    remaining_lease: '62 years 01 month',
    resale_price: 688000,
    lat: 1.3501,
    lng: 103.8524
  },
  {
    _id: 'bsh-2',
    month: '2024-06',
    town: 'BISHAN',
    flat_type: '5 ROOM',
    block: '273A',
    street_name: 'BISHAN ST 24',
    storey_range: '31 TO 33',
    floor_area_sqm: 120,
    flat_model: 'DBSS (Natura Loft)',
    lease_commence_date: '2012',
    remaining_lease: '86 years 08 months',
    resale_price: 1380000,
    lat: 1.3582,
    lng: 103.8436
  },
  {
    _id: 'bsh-3',
    month: '2024-04',
    town: 'BISHAN',
    flat_type: '3 ROOM',
    block: '150',
    street_name: 'BISHAN ST 11',
    storey_range: '04 TO 06',
    floor_area_sqm: 68,
    flat_model: 'Simplified',
    lease_commence_date: '1986',
    remaining_lease: '61 years 04 months',
    resale_price: 435000,
    lat: 1.3468,
    lng: 103.8546
  },

  // TAMPINES
  {
    _id: 'tam-1',
    month: '2024-06',
    town: 'TAMPINES',
    flat_type: '4 ROOM',
    block: '494D',
    street_name: 'TAMPINES ST 45',
    storey_range: '07 TO 09',
    floor_area_sqm: 100,
    flat_model: 'Model A',
    lease_commence_date: '1996',
    remaining_lease: '71 years 02 months',
    resale_price: 540000,
    lat: 1.3615,
    lng: 103.9576
  },
  {
    _id: 'tam-2',
    month: '2024-05',
    town: 'TAMPINES',
    flat_type: '5 ROOM',
    block: '868A',
    street_name: 'TAMPINES AVE 8',
    storey_range: '13 TO 15',
    floor_area_sqm: 113,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2015',
    remaining_lease: '89 years 06 months',
    resale_price: 825000,
    lat: 1.3551,
    lng: 103.9332
  },
  {
    _id: 'tam-3',
    month: '2024-06',
    town: 'TAMPINES',
    flat_type: 'EXECUTIVE',
    block: '343',
    street_name: 'TAMPINES ST 33',
    storey_range: '04 TO 06',
    floor_area_sqm: 147,
    flat_model: 'Maisonette',
    lease_commence_date: '1993',
    remaining_lease: '67 years 10 months',
    resale_price: 998000,
    lat: 1.3524,
    lng: 103.9612
  },
  {
    _id: 'tam-4',
    month: '2024-04',
    town: 'TAMPINES',
    flat_type: '3 ROOM',
    block: '432',
    street_name: 'TAMPINES ST 41',
    storey_range: '04 TO 06',
    floor_area_sqm: 73,
    flat_model: 'Simplified',
    lease_commence_date: '1985',
    remaining_lease: '60 years 03 months',
    resale_price: 395000,
    lat: 1.3589,
    lng: 103.9521
  },

  // BEDOK
  {
    _id: 'bdk-1',
    month: '2024-05',
    town: 'BEDOK',
    flat_type: '3 ROOM',
    block: '29',
    street_name: 'CHAI CHEE AVE',
    storey_range: '04 TO 06',
    floor_area_sqm: 67,
    flat_model: 'New Generation',
    lease_commence_date: '1979',
    remaining_lease: '53 years 11 months',
    resale_price: 360000,
    lat: 1.3255,
    lng: 103.9221
  },
  {
    _id: 'bdk-2',
    month: '2024-06',
    town: 'BEDOK',
    flat_type: '4 ROOM',
    block: '219A',
    street_name: 'BEDOK CENTRAL',
    storey_range: '16 TO 18',
    floor_area_sqm: 95,
    flat_model: 'Model A',
    lease_commence_date: '2011',
    remaining_lease: '85 years 07 months',
    resale_price: 785000,
    lat: 1.3248,
    lng: 103.9338
  },
  {
    _id: 'bdk-3',
    month: '2024-05',
    town: 'BEDOK',
    flat_type: '5 ROOM',
    block: '761',
    street_name: 'BEDOK RESERVOIR VIEW',
    storey_range: '10 TO 12',
    floor_area_sqm: 122,
    flat_model: 'Improved',
    lease_commence_date: '2000',
    remaining_lease: '74 years 08 months',
    resale_price: 730000,
    lat: 1.3361,
    lng: 103.9352
  },

  // JURONG EAST
  {
    _id: 'je-1',
    month: '2024-05',
    town: 'JURONG EAST',
    flat_type: '3 ROOM',
    block: '241',
    street_name: 'JURONG EAST ST 24',
    storey_range: '04 TO 06',
    floor_area_sqm: 73,
    flat_model: 'Model A',
    lease_commence_date: '1983',
    remaining_lease: '58 years 01 month',
    resale_price: 375000,
    lat: 1.3430,
    lng: 103.7420
  },
  {
    _id: 'je-2',
    month: '2024-06',
    town: 'JURONG EAST',
    flat_type: '4 ROOM',
    block: '288B',
    street_name: 'JURONG EAST ST 21',
    storey_range: '22 TO 24',
    floor_area_sqm: 93,
    flat_model: 'Model A',
    lease_commence_date: '2016',
    remaining_lease: '90 years 05 months',
    resale_price: 720000,
    lat: 1.3382,
    lng: 103.7454
  },
  {
    _id: 'je-3',
    month: '2024-05',
    town: 'JURONG EAST',
    flat_type: '5 ROOM',
    block: '105',
    street_name: 'JURONG EAST ST 13',
    storey_range: '13 TO 15',
    floor_area_sqm: 120,
    flat_model: 'Improved',
    lease_commence_date: '1998',
    remaining_lease: '73 years 02 months',
    resale_price: 660000,
    lat: 1.3389,
    lng: 103.7380
  },

  // JURONG WEST
  {
    _id: 'jw-1',
    month: '2024-05',
    town: 'JURONG WEST',
    flat_type: '3 ROOM',
    block: '415',
    street_name: 'JURONG WEST ST 42',
    storey_range: '07 TO 09',
    floor_area_sqm: 67,
    flat_model: 'New Generation',
    lease_commence_date: '1984',
    remaining_lease: '59 years 01 month',
    resale_price: 335000,
    lat: 1.3533,
    lng: 103.7198
  },
  {
    _id: 'jw-2',
    month: '2024-06',
    town: 'JURONG WEST',
    flat_type: '4 ROOM',
    block: '674B',
    street_name: 'JURONG WEST ST 65',
    storey_range: '10 TO 12',
    floor_area_sqm: 90,
    flat_model: 'Model A',
    lease_commence_date: '2002',
    remaining_lease: '77 years 04 months',
    resale_price: 495000,
    lat: 1.3444,
    lng: 103.7029
  },
  {
    _id: 'jw-3',
    month: '2024-05',
    town: 'JURONG WEST',
    flat_type: '5 ROOM',
    block: '988C',
    street_name: 'JURONG WEST ST 93',
    storey_range: '13 TO 15',
    floor_area_sqm: 110,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2016',
    remaining_lease: '90 years 08 months',
    resale_price: 638000,
    lat: 1.3369,
    lng: 103.6931
  },

  // WOODLANDS
  {
    _id: 'wdl-1',
    month: '2024-05',
    town: 'WOODLANDS',
    flat_type: '3 ROOM',
    block: '121',
    street_name: 'MARSILING RISE',
    storey_range: '07 TO 09',
    floor_area_sqm: 65,
    flat_model: 'Improved',
    lease_commence_date: '1976',
    remaining_lease: '50 years 09 months',
    resale_price: 295000,
    lat: 1.4362,
    lng: 103.7788
  },
  {
    _id: 'wdl-2',
    month: '2024-06',
    town: 'WOODLANDS',
    flat_type: '4 ROOM',
    block: '588',
    street_name: 'WOODLANDS DRIVE 16',
    storey_range: '04 TO 06',
    floor_area_sqm: 92,
    flat_model: 'Model A',
    lease_commence_date: '2014',
    remaining_lease: '88 years 07 months',
    resale_price: 520000,
    lat: 1.4308,
    lng: 103.7925
  },
  {
    _id: 'wdl-3',
    month: '2024-05',
    town: 'WOODLANDS',
    flat_type: '5 ROOM',
    block: '886D',
    street_name: 'WOODLANDS DRIVE 50',
    storey_range: '10 TO 12',
    floor_area_sqm: 112,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2018',
    remaining_lease: '92 years 04 months',
    resale_price: 680000,
    lat: 1.4359,
    lng: 103.7963
  },
  {
    _id: 'wdl-4',
    month: '2024-05',
    town: 'WOODLANDS',
    flat_type: 'EXECUTIVE',
    block: '834',
    street_name: 'WOODLANDS ST 83',
    storey_range: '07 TO 09',
    floor_area_sqm: 142,
    flat_model: 'Apartment',
    lease_commence_date: '1995',
    remaining_lease: '69 years 05 months',
    resale_price: 760000,
    lat: 1.4429,
    lng: 103.7909
  },

  // YISHUN
  {
    _id: 'yis-1',
    month: '2024-05',
    town: 'YISHUN',
    flat_type: '3 ROOM',
    block: '741',
    street_name: 'YISHUN AVE 5',
    storey_range: '07 TO 09',
    floor_area_sqm: 68,
    flat_model: 'Simplified',
    lease_commence_date: '1985',
    remaining_lease: '60 years 02 months',
    resale_price: 340000,
    lat: 1.4312,
    lng: 103.8322
  },
  {
    _id: 'yis-2',
    month: '2024-06',
    town: 'YISHUN',
    flat_type: '4 ROOM',
    block: '505A',
    street_name: 'YISHUN ST 51',
    storey_range: '10 TO 12',
    floor_area_sqm: 93,
    flat_model: 'Model A',
    lease_commence_date: '2017',
    remaining_lease: '91 years 10 months',
    resale_price: 580000,
    lat: 1.4215,
    lng: 103.8428
  },
  {
    _id: 'yis-3',
    month: '2024-05',
    town: 'YISHUN',
    flat_type: '5 ROOM',
    block: '675C',
    street_name: 'YISHUN AVE 4',
    storey_range: '13 TO 15',
    floor_area_sqm: 112,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2019',
    remaining_lease: '93 years 07 months',
    resale_price: 728000,
    lat: 1.4241,
    lng: 103.8398
  },

  // QUEENSTOWN & CENTRAL AREA ($1M+ Club flats & prime)
  {
    _id: 'qtn-1',
    month: '2024-06',
    town: 'QUEENSTOWN',
    flat_type: '4 ROOM',
    block: '90',
    street_name: 'DAWSON RD',
    storey_range: '37 TO 39',
    floor_area_sqm: 85,
    flat_model: 'Model A (SkyTerrace@Dawson)',
    lease_commence_date: '2015',
    remaining_lease: '89 years 11 months',
    resale_price: 1050000,
    lat: 1.2982,
    lng: 103.8098
  },
  {
    _id: 'qtn-2',
    month: '2024-05',
    town: 'QUEENSTOWN',
    flat_type: '5 ROOM',
    block: '88',
    street_name: 'DAWSON RD',
    storey_range: '40 TO 42',
    floor_area_sqm: 122,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2015',
    remaining_lease: '90 years 01 month',
    resale_price: 1350000,
    lat: 1.2974,
    lng: 103.8105
  },
  {
    _id: 'qtn-3',
    month: '2024-05',
    town: 'QUEENSTOWN',
    flat_type: '3 ROOM',
    block: '48',
    street_name: 'STIRLING RD',
    storey_range: '04 TO 06',
    floor_area_sqm: 60,
    flat_model: 'Standard',
    lease_commence_date: '1970',
    remaining_lease: '45 years 02 months',
    resale_price: 368000,
    lat: 1.2965,
    lng: 103.8032
  },
  {
    _id: 'cnt-1',
    month: '2024-06',
    town: 'CENTRAL AREA',
    flat_type: '4 ROOM',
    block: '1A',
    street_name: 'CANTONMENT RD',
    storey_range: '43 TO 45',
    floor_area_sqm: 95,
    flat_model: 'Type S1 (The Pinnacle@Duxton)',
    lease_commence_date: '2011',
    remaining_lease: '85 years 05 months',
    resale_price: 1388000,
    lat: 1.2774,
    lng: 103.8415
  },
  {
    _id: 'cnt-2',
    month: '2024-05',
    town: 'CENTRAL AREA',
    flat_type: '5 ROOM',
    block: '1G',
    street_name: 'CANTONMENT RD',
    storey_range: '46 TO 48',
    floor_area_sqm: 106,
    flat_model: 'Type S2 (The Pinnacle@Duxton)',
    lease_commence_date: '2011',
    remaining_lease: '85 years 05 months',
    resale_price: 1480000,
    lat: 1.2792,
    lng: 103.8432
  },

  // BUKIT MERAH
  {
    _id: 'bm-1',
    month: '2024-05',
    town: 'BUKIT MERAH',
    flat_type: '4 ROOM',
    block: '96A',
    street_name: 'HENDERSON RD',
    storey_range: '40 TO 42',
    floor_area_sqm: 93,
    flat_model: 'Model A',
    lease_commence_date: '2019',
    remaining_lease: '93 years 06 months',
    resale_price: 1220000,
    lat: 1.2858,
    lng: 103.8211
  },
  {
    _id: 'bm-2',
    month: '2024-04',
    town: 'BUKIT MERAH',
    flat_type: '3 ROOM',
    block: '121',
    street_name: 'KIM TIAN PL',
    storey_range: '10 TO 12',
    floor_area_sqm: 65,
    flat_model: 'Improved',
    lease_commence_date: '2001',
    remaining_lease: '75 years 04 months',
    resale_price: 520000,
    lat: 1.2828,
    lng: 103.8290
  },

  // TOA PAYOH
  {
    _id: 'tp-1',
    month: '2024-05',
    town: 'TOA PAYOH',
    flat_type: '4 ROOM',
    block: '139A',
    street_name: 'LOR 1A TOA PAYOH',
    storey_range: '34 TO 36',
    floor_area_sqm: 95,
    flat_model: 'DBSS (The Peak)',
    lease_commence_date: '2012',
    remaining_lease: '86 years 09 months',
    resale_price: 980000,
    lat: 1.3374,
    lng: 103.8459
  },
  {
    _id: 'tp-2',
    month: '2024-06',
    town: 'TOA PAYOH',
    flat_type: '5 ROOM',
    block: '139B',
    street_name: 'LOR 1A TOA PAYOH',
    storey_range: '37 TO 39',
    floor_area_sqm: 114,
    flat_model: 'DBSS (The Peak)',
    lease_commence_date: '2012',
    remaining_lease: '86 years 09 months',
    resale_price: 1280000,
    lat: 1.3379,
    lng: 103.8455
  },
  {
    _id: 'tp-3',
    month: '2024-05',
    town: 'TOA PAYOH',
    flat_type: '3 ROOM',
    block: '19',
    street_name: 'LOR 7 TOA PAYOH',
    storey_range: '07 TO 09',
    floor_area_sqm: 65,
    flat_model: 'Improved',
    lease_commence_date: '1971',
    remaining_lease: '45 years 10 months',
    resale_price: 330000,
    lat: 1.3335,
    lng: 103.8582
  },

  // SENGKANG
  {
    _id: 'sk-1',
    month: '2024-06',
    town: 'SENGKANG',
    flat_type: '4 ROOM',
    block: '455B',
    street_name: 'SENGKANG WEST AVE',
    storey_range: '13 TO 15',
    floor_area_sqm: 92,
    flat_model: 'Model A',
    lease_commence_date: '2016',
    remaining_lease: '90 years 08 months',
    resale_price: 575000,
    lat: 1.3912,
    lng: 103.8788
  },
  {
    _id: 'sk-2',
    month: '2024-05',
    town: 'SENGKANG',
    flat_type: '5 ROOM',
    block: '207B',
    street_name: 'COMPASSVALE LANE',
    storey_range: '16 TO 18',
    floor_area_sqm: 112,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2017',
    remaining_lease: '91 years 04 months',
    resale_price: 745000,
    lat: 1.3854,
    lng: 103.8969
  },
  {
    _id: 'sk-3',
    month: '2024-04',
    town: 'SENGKANG',
    flat_type: '3 ROOM',
    block: '306C',
    street_name: 'ANCHORVALE LINK',
    storey_range: '10 TO 12',
    floor_area_sqm: 68,
    flat_model: 'Model A',
    lease_commence_date: '2003',
    remaining_lease: '77 years 07 months',
    resale_price: 430000,
    lat: 1.3900,
    lng: 103.8890
  },

  // PUNGGOL
  {
    _id: 'pg-1',
    month: '2024-06',
    town: 'PUNGGOL',
    flat_type: '4 ROOM',
    block: '313B',
    street_name: 'SUMANG LINK',
    storey_range: '16 TO 18',
    floor_area_sqm: 93,
    flat_model: 'Model A (Punggol BayView)',
    lease_commence_date: '2017',
    remaining_lease: '91 years 11 months',
    resale_price: 615000,
    lat: 1.4082,
    lng: 103.8995
  },
  {
    _id: 'pg-2',
    month: '2024-05',
    town: 'PUNGGOL',
    flat_type: '5 ROOM',
    block: '271B',
    street_name: 'PUNGGOL FIELD',
    storey_range: '13 TO 15',
    floor_area_sqm: 112,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2016',
    remaining_lease: '90 years 07 months',
    resale_price: 770000,
    lat: 1.4025,
    lng: 103.9056
  },
  {
    _id: 'pg-3',
    month: '2024-05',
    town: 'PUNGGOL',
    flat_type: '4 ROOM',
    block: '601A',
    street_name: 'PUNGGOL CENTRAL',
    storey_range: '10 TO 12',
    floor_area_sqm: 92,
    flat_model: 'Model A (Waterway Terraces)',
    lease_commence_date: '2015',
    remaining_lease: '89 years 09 months',
    resale_price: 690000,
    lat: 1.4055,
    lng: 103.9079
  },

  // HOUGANG
  {
    _id: 'hg-1',
    month: '2024-05',
    town: 'HOUGANG',
    flat_type: '4 ROOM',
    block: '447',
    street_name: 'HOUGANG AVE 10',
    storey_range: '10 TO 12',
    floor_area_sqm: 104,
    flat_model: 'Model A',
    lease_commence_date: '1987',
    remaining_lease: '62 years 03 months',
    resale_price: 520000,
    lat: 1.3739,
    lng: 103.8962
  },
  {
    _id: 'hg-2',
    month: '2024-06',
    town: 'HOUGANG',
    flat_type: '5 ROOM',
    block: '838',
    street_name: 'HOUGANG CENTRAL',
    storey_range: '13 TO 15',
    floor_area_sqm: 121,
    flat_model: 'Improved',
    lease_commence_date: '1998',
    remaining_lease: '73 years 06 months',
    resale_price: 810000,
    lat: 1.3702,
    lng: 103.8932
  },

  // PASIR RIS
  {
    _id: 'pr-1',
    month: '2024-05',
    town: 'PASIR RIS',
    flat_type: '4 ROOM',
    block: '536',
    street_name: 'PASIR RIS DRIVE 1',
    storey_range: '07 TO 09',
    floor_area_sqm: 104,
    flat_model: 'Model A',
    lease_commence_date: '1989',
    remaining_lease: '64 years 06 months',
    resale_price: 535000,
    lat: 1.3729,
    lng: 103.9515
  },
  {
    _id: 'pr-2',
    month: '2024-06',
    town: 'PASIR RIS',
    flat_type: 'EXECUTIVE',
    block: '628',
    street_name: 'ELIAS RD',
    storey_range: '07 TO 09',
    floor_area_sqm: 147,
    flat_model: 'Maisonette',
    lease_commence_date: '1995',
    remaining_lease: '69 years 08 months',
    resale_price: 940000,
    lat: 1.3768,
    lng: 103.9421
  },

  // CLEMENTI
  {
    _id: 'clm-1',
    month: '2024-05',
    town: 'CLEMENTI',
    flat_type: '3 ROOM',
    block: '335',
    street_name: 'CLEMENTI AVE 2',
    storey_range: '07 TO 09',
    floor_area_sqm: 67,
    flat_model: 'New Generation',
    lease_commence_date: '1978',
    remaining_lease: '52 years 08 months',
    resale_price: 398000,
    lat: 1.3142,
    lng: 103.7689
  },
  {
    _id: 'clm-2',
    month: '2024-06',
    town: 'CLEMENTI',
    flat_type: '5 ROOM',
    block: '441A',
    street_name: 'CLEMENTI AVE 3',
    storey_range: '34 TO 36',
    floor_area_sqm: 116,
    flat_model: 'Model A (Clementi Towers)',
    lease_commence_date: '2012',
    remaining_lease: '86 years 07 months',
    resale_price: 1180000,
    lat: 1.3149,
    lng: 103.7645
  },

  // BUKIT BATOK
  {
    _id: 'bb-1',
    month: '2024-05',
    town: 'BUKIT BATOK',
    flat_type: '4 ROOM',
    block: '289C',
    street_name: 'BUKIT BATOK ST 25',
    storey_range: '10 TO 12',
    floor_area_sqm: 93,
    flat_model: 'Model A',
    lease_commence_date: '2017',
    remaining_lease: '91 years 09 months',
    resale_price: 610000,
    lat: 1.3458,
    lng: 103.7570
  },
  {
    _id: 'bb-2',
    month: '2024-04',
    town: 'BUKIT BATOK',
    flat_type: '3 ROOM',
    block: '112',
    street_name: 'BUKIT BATOK WEST AVE 6',
    storey_range: '04 TO 06',
    floor_area_sqm: 68,
    flat_model: 'Simplified',
    lease_commence_date: '1984',
    remaining_lease: '59 years 01 month',
    resale_price: 345000,
    lat: 1.3482,
    lng: 103.7461
  },

  // CHOA CHU KANG
  {
    _id: 'cck-1',
    month: '2024-06',
    town: 'CHOA CHU KANG',
    flat_type: '4 ROOM',
    block: '211',
    street_name: 'CHOA CHU KANG CENTRAL',
    storey_range: '10 TO 12',
    floor_area_sqm: 102,
    flat_model: 'Model A',
    lease_commence_date: '1990',
    remaining_lease: '65 years 03 months',
    resale_price: 490000,
    lat: 1.3828,
    lng: 103.7482
  },
  {
    _id: 'cck-2',
    month: '2024-05',
    town: 'CHOA CHU KANG',
    flat_type: '5 ROOM',
    block: '485B',
    street_name: 'CHOA CHU KANG AVE 5',
    storey_range: '13 TO 15',
    floor_area_sqm: 112,
    flat_model: 'Premium Apartment',
    lease_commence_date: '2016',
    remaining_lease: '90 years 07 months',
    resale_price: 648000,
    lat: 1.3749,
    lng: 103.7380
  },

  // BUKIT PANJANG
  {
    _id: 'bp-1',
    month: '2024-05',
    town: 'BUKIT PANJANG',
    flat_type: '4 ROOM',
    block: '537',
    street_name: 'JELEBU RD',
    storey_range: '16 TO 18',
    floor_area_sqm: 100,
    flat_model: 'Model A',
    lease_commence_date: '2001',
    remaining_lease: '75 years 08 months',
    resale_price: 570000,
    lat: 1.3798,
    lng: 103.7634
  },

  // SEMBAWANG
  {
    _id: 'sbw-1',
    month: '2024-06',
    town: 'SEMBAWANG',
    flat_type: '4 ROOM',
    block: '356A',
    street_name: 'ADMIRALTY DRIVE',
    storey_range: '07 TO 09',
    floor_area_sqm: 90,
    flat_model: 'Model A',
    lease_commence_date: '2001',
    remaining_lease: '76 years 02 months',
    resale_price: 468000,
    lat: 1.4502,
    lng: 103.8160
  },

  // KALLANG/WHAMPOA
  {
    _id: 'kw-1',
    month: '2024-05',
    town: 'KALLANG/WHAMPOA',
    flat_type: '4 ROOM',
    block: '8A',
    street_name: 'UPPER BOON KENG RD',
    storey_range: '28 TO 30',
    floor_area_sqm: 93,
    flat_model: 'Model A',
    lease_commence_date: '2017',
    remaining_lease: '91 years 08 months',
    resale_price: 935000,
    lat: 1.3149,
    lng: 103.8710
  },
  {
    _id: 'kw-2',
    month: '2024-06',
    town: 'KALLANG/WHAMPOA',
    flat_type: '3 ROOM',
    block: '34',
    street_name: 'WHAMPOA WEST',
    storey_range: '10 TO 12',
    floor_area_sqm: 68,
    flat_model: 'Improved',
    lease_commence_date: '1972',
    remaining_lease: '47 years 03 months',
    resale_price: 360000,
    lat: 1.3190,
    lng: 103.8624
  },

  // GEYLANG
  {
    _id: 'gyl-1',
    month: '2024-05',
    town: 'GEYLANG',
    flat_type: '4 ROOM',
    block: '10',
    street_name: 'EUNOS CRES',
    storey_range: '07 TO 09',
    floor_area_sqm: 90,
    flat_model: 'Model A',
    lease_commence_date: '2006',
    remaining_lease: '80 years 09 months',
    resale_price: 690000,
    lat: 1.3211,
    lng: 103.9042
  },

  // SERANGOON
  {
    _id: 'ser-1',
    month: '2024-05',
    town: 'SERANGOON',
    flat_type: '4 ROOM',
    block: '264',
    street_name: 'SERANGOON CENTRAL',
    storey_range: '10 TO 12',
    floor_area_sqm: 102,
    flat_model: 'Model A',
    lease_commence_date: '1989',
    remaining_lease: '64 years 01 month',
    resale_price: 660000,
    lat: 1.3524,
    lng: 103.8722
  },
  {
    _id: 'ser-2',
    month: '2024-06',
    town: 'SERANGOON',
    flat_type: '5 ROOM',
    block: '534',
    street_name: 'SERANGOON NORTH AVE 4',
    storey_range: '07 TO 09',
    floor_area_sqm: 122,
    flat_model: 'Improved',
    lease_commence_date: '1992',
    remaining_lease: '67 years 04 months',
    resale_price: 760000,
    lat: 1.3732,
    lng: 103.8745
  },

  // MARINE PARADE
  {
    _id: 'mp-1',
    month: '2024-05',
    town: 'MARINE PARADE',
    flat_type: '3 ROOM',
    block: '55',
    street_name: 'MARINE DRIVE',
    storey_range: '13 TO 15',
    floor_area_sqm: 65,
    flat_model: 'Improved',
    lease_commence_date: '1976',
    remaining_lease: '50 years 11 months',
    resale_price: 495000,
    lat: 1.3032,
    lng: 103.9068
  }
];

// Helper: Haversine distance in meters
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Find nearest MRT station
export function findNearestMrt(lat: number, lng: number): { station: MrtStation; distanceMeters: number } {
  let nearest = MRT_STATIONS[0];
  let minDistance = Infinity;

  for (const station of MRT_STATIONS) {
    const dist = getDistanceMeters(lat, lng, station.lat, station.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = station;
    }
  }

  return { station: nearest, distanceMeters: minDistance };
}

// Format Singapore Currency
export function formatSGD(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0
  }).format(amount);
}

// Price Band category definitions
export interface PriceBand {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  markerHex: string;
}

export const PRICE_BANDS: PriceBand[] = [
  {
    id: 'budget',
    label: 'Budget-Friendly (< $450k)',
    min: 0,
    max: 450000,
    color: 'emerald',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    textColor: 'text-emerald-400',
    markerHex: '#10b981'
  },
  {
    id: 'mid',
    label: 'Mid-Range ($450k - $700k)',
    min: 450000,
    max: 700000,
    color: 'amber',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/40',
    textColor: 'text-amber-400',
    markerHex: '#f59e0b'
  },
  {
    id: 'prime',
    label: 'Prime Tier ($700k - $950k)',
    min: 700000,
    max: 950000,
    color: 'sky',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/40',
    textColor: 'text-sky-400',
    markerHex: '#0284c7'
  },
  {
    id: 'million',
    label: 'High-Value / $1M+ Club (≥ $950k)',
    min: 950000,
    max: Infinity,
    color: 'rose',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/40',
    textColor: 'text-rose-400',
    markerHex: '#f43f5e'
  }
];

export function getPriceBand(price: number): PriceBand {
  if (price < 450000) return PRICE_BANDS[0];
  if (price < 700000) return PRICE_BANDS[1];
  if (price < 950000) return PRICE_BANDS[2];
  return PRICE_BANDS[3];
}
