import { StatisticData, ChartDataPoint } from './types';



// Add this type for totals if not already present
interface TotalResults {
  totalnewPending: number;
  totalnewPaid: number;
  totalnewPaidViaEgov: number;
  totalrenewPending: number;
  totalrenewPaid: number;
  totalrenewPaidViaEgov: number;
  totalmalePending: number;
  totalmalePaid: number;
  totalfemalePending: number;
  totalfemalePaid: number;
}

// Update the stats generation
export const getUpdatedStats = (totals: TotalResults) => {
  const totalTransactions =
    totals.totalnewPending +
    totals.totalnewPaid +
    totals.totalrenewPending +
    totals.totalrenewPaid;

  const mainStats: StatisticData[] = [
    {
      title: 'No. of Transaction',
      value: totalTransactions.toString(),
      showInfo: true
    },
    // Keep other stats as they are
    { title: 'Operational LGU', value: '836', showInfo: true },
    { title: 'Developmental', value: '76', showInfo: true },
  ];

  const genderStats: StatisticData[] = [
    {
      title: 'No. of Male',
      value: (totals.totalmalePending + totals.totalmalePaid).toString()
    },
    {
      title: 'No. of Female',
      value: (totals.totalfemalePending + totals.totalfemalePaid).toString()
    },
    { title: 'Non-Binary', value: '0' },
  ];

  return { mainStats, genderStats };
};

export const mainStats: StatisticData[] = [
  { title: 'No. of Transaction', value: '8,846', showInfo: true },
  { title: 'Operational LGU', value: '836', showInfo: true },
  { title: 'Developmental', value: '76', showInfo: true },
];

export const genderStats: StatisticData[] = [
  { title: 'No. of Male', value: '4,046' },
  { title: 'No. of Female', value: '4,800' },
  { title: 'Non-Binary', value: '0' },
];

export const operationalLguChartData: ChartDataPoint[] = [
  { name: 'CAR', operational: 21, developmental: 9 },
  { name: 'Region I', operational: 35, developmental: 22 },
  { name: 'Region II', operational: 28, developmental: 15 },
  { name: 'Region III', operational: 8, developmental: 21 },
  { name: 'Region IV-A', operational: 24, developmental: 17 },
  { name: 'Region IV-B', operational: 21, developmental: 18 },
  { name: 'CAR', operational: 21, developmental: 9 },
  { name: 'Region I', operational: 35, developmental: 22 },
  { name: 'Region II', operational: 28, developmental: 15 },
  { name: 'Region III', operational: 8, developmental: 21 },
  { name: 'Region IV-A', operational: 24, developmental: 17 },
  { name: 'Region IV-B', operational: 21, developmental: 18 },

];

export const mockTransactionChartData = [
  {
    name: 'CAR',
    paidMale: 472,
    paidFemale: 20,
    pendingMale: 34,
    pendingFemale: 1,
  },
  {
    name: 'Region I',
    paidMale:107,
    paidFemale: 449,
    pendingMale: 67,
    pendingFemale: 1,
  },
  {
    name: 'Region II',
    paidMale: 1106,
    paidFemale: 111,
    pendingMale: 63,
    pendingFemale: 6,
  },
  {
    name: 'Region III',
    paidMale: 971,
    paidFemale: 125,
    pendingMale: 0,
    pendingFemale: 0,
  },
  {
    name: 'Region IV-A',
    paidMale: 800,
    paidFemale: 300,
    pendingMale: 2,
    pendingFemale: 4,
  },
];

export const transactionChartData = [
  {
    name: 'CAR',
    paid: 38,
    pending: 64,
    paidEGov: 16,
    paidLinkBiz: 39
  },
  {
    name: 'Region I',
    paid: 38,
    pending: 24,
    paidEGov: 16,
    paidLinkBiz: 39
  },
  {
    name: 'Region II',
    paid: 78,
    pending: 64,
    paidEGov: 19,
    paidLinkBiz: 34
  },
  {
    name: 'Region III',
    paid: 88,
    pending: 14,
    paidEGov: 14,
    paidLinkBiz: 37
  },
  {
    name: 'Region IV-A',
    paid: 58,
    pending: 14,
    paidEGov: 51,
    paidLinkBiz: 38
  }
];

export const monthlyComparisonChartData: ChartDataPoint[] = [
  { name: 'CAR', previous: 25, current: 18 },
  { name: 'Region I', previous: 15, current: 13 },
  { name: 'Region II', previous: 29, current: 26 },
  { name: 'Region III', previous: 34, current: 38 },
  { name: 'Region IV-A', previous: 19, current: 13 },
  { name: 'Region IV-B', previous: 12, current: 15 },
];

export const modules = [
  "Business Permit",
    "Working Permit",
    "Barangay Clearance",
];

export const regions = [
  "I", "II", "III", "IV-A", "V","CAR", "IV-B", "VII", "VIII", "NIR", "VI", "IX", "X", "XI", "XII", "BARMM I", "BARMM II", "XIII"
];


export const groupOfIslands = ["Luzon", "Visayas", "Mindanao"];
export const regionGroups = [
  ["I", "II", "III", "IV-A", "V"],
  ["CAR", "IV-B", "VII", "VIII"],
  ["VI", "IX", "X", "XI", "XII"],
  [ "BARMM I", "BARMM II", "XIII"]
];

// Complete data for provinces and cities
export const provinces = [
  // Luzon provinces
  "Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan", // Region I
  "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales", // Region III
  "Batangas", "Cavite", "Laguna", "Quezon", "Rizal", // Region IV-A
  "Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon", // Region V
  "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", // Region II
  "Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province", // CAR
  "Metro Manila", // IV-B
  
  // Visayas provinces
  "Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental", // Region VI
  "Bohol", "Cebu", "Negros Oriental", "Siquijor", // Region VII
  "Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte", // Region VIII
  "Negros del Norte", // NIR
  
  // Mindanao provinces
  "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay", // Region IX
  "Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental", // Region X
  "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", // Region XI
  "Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat", // Region XII
  "Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur", // Region XIII
  "Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi" // BARMM
];

export const cities:any = {
  // Region I - Ilocos Region
  "Ilocos Norte": ["Laoag City", "Batac City", "Adams", "Bacarra", "Badoc", "Bangui", "Banna", "Burgos", "Carasi", "Currimao", "Dingras", "Dumalneg", "Marcos", "Nueva Era", "Pagudpud", "Paoay", "Pasuquin", "Piddig", "Pinili", "San Nicolas", "Sarrat", "Solsona", "Vintar"],
  "Ilocos Sur": ["Vigan City", "Candon City", "Alilem", "Banayoyo", "Bantay", "Burgos", "Cabugao", "Caoayan", "Cervantes", "Galimuyod", "Gregorio del Pilar", "Lidlidda", "Magsingal", "Nagbukel", "Narvacan", "Quirino", "Salcedo", "San Emilio", "San Esteban", "San Ildefonso", "San Juan", "San Vicente", "Santa", "Santa Catalina", "Santa Cruz", "Santa Lucia", "Santa Maria", "Santiago", "Santo Domingo", "Sigay", "Sinait", "Sugpon", "Suyo", "Tagudin"],
  "La Union": ["San Fernando City", "Agoo", "Aringay", "Bacnotan", "Bagulin", "Balaoan", "Bangar", "Bauang", "Burgos", "Caba", "Luna", "Naguilian", "Pugo", "Rosario", "San Gabriel", "San Juan", "Santo Tomas", "Santol", "Sudipen", "Tubao"],
  "Pangasinan": ["Dagupan City", "San Carlos City", "Urdaneta City", "Alaminos City", "Agno", "Aguilar", "Alcala", "Anda", "Asingan", "Balungao", "Bani", "Basista", "Bautista", "Bayambang", "Binalonan", "Binmaley", "Bolinao", "Bugallon", "Burgos", "Calasiao", "Dasol", "Infanta", "Labrador", "Laoac", "Lingayen", "Mabini", "Malasiqui", "Manaoag", "Mangaldan", "Mangatarem", "Mapandan", "Natividad", "Pozorrubio", "Rosales", "San Fabian", "San Jacinto", "San Manuel", "San Nicolas", "San Quintin", "Santa Barbara", "Santa Maria", "Santo Tomas", "Sison", "Sual", "Tayug", "Umingan", "Urbiztondo", "Villasis"],

  // Region II - Cagayan Valley
  "Cagayan": ["Tuguegarao City", "Abulug", "Alcala", "Allacapan", "Amulung", "Aparri", "Baggao", "Ballesteros", "Buguey", "Calayan", "Camalaniugan", "Claveria", "Enrile", "Gattaran", "Gonzaga", "Iguig", "Lal-lo", "Lasam", "Pamplona", "Peñablanca", "Piat", "Rizal", "Sanchez-Mira", "Santa Ana", "Santa Praxedes", "Santa Teresita", "Santo Niño", "Solana", "Tuao"],
  "Isabela": ["Ilagan City", "Santiago City", "Cauayan City", "Alicia", "Angadanan", "Aurora", "Benito Soliven", "Burgos", "Cabagan", "Cabatuan", "Cordon", "Delfin Albano", "Dinapigue", "Divilacan", "Echague", "Gamu", "Jones", "Luna", "Maconacon", "Mallig", "Naguilian", "Palanan", "Quezon", "Quirino", "Ramon", "Reina Mercedes", "Roxas", "San Agustin", "San Guillermo", "San Isidro", "San Manuel", "San Mariano", "San Mateo", "San Pablo", "Santa Maria", "Santo Tomas", "Tumauini"],
  "Nueva Vizcaya": ["Aritao", "Bagabag", "Bambang", "Bayombong", "Diadi", "Dupax del Norte", "Dupax del Sur", "Kasibu", "Kayapa", "Quezon", "Santa Fe", "Solano", "Villaverde"],
  "Quirino": ["Aglipay", "Cabarroguis", "Diffun", "Maddela", "Nagtipunan", "Saguday"],

  // Region III - Central Luzon
  "Bataan": ["Balanga City", "Abucay", "Bagac", "Dinalupihan", "Hermosa", "Limay", "Mariveles", "Morong", "Orani", "Orion", "Pilar", "Samal"],
  "Bulacan": ["Malolos City", "Meycauayan City", "San Jose del Monte City", "Angat", "Balagtas", "Baliuag", "Bocaue", "Bulakan", "Bustos", "Calumpit", "Doña Remedios Trinidad", "Guiguinto", "Hagonoy", "Marilao", "Norzagaray", "Obando", "Pandi", "Paombong", "Plaridel", "Pulilan", "San Ildefonso", "San Miguel", "San Rafael", "Santa Maria"],
  "Nueva Ecija": ["Palayan City", "Cabanatuan City", "Gapan City", "San Antonio City", "Science City of Muñoz", "Aliaga", "Bongabon", "Cabiao", "Carranglan", "Cuyapo", "Gabaldon", "General Mamerto Natividad", "General Tinio", "Guimba", "Jaen", "Laur", "Licab", "Llanera", "Lupao", "Nampicuan", "Pantabangan", "Peñaranda", "Quezon", "Rizal", "San Isidro", "San Leonardo", "Santa Rosa", "Santo Domingo", "Talavera", "Talugtug", "Zaragoza"],
  "Pampanga": ["San Fernando City", "Angeles City", "Apalit", "Arayat", "Bacolor", "Candaba", "Floridablanca", "Guagua", "Lubao", "Mabalacat", "Macabebe", "Magalang", "Masantol", "Mexico", "Minalin", "Porac", "Sasmuan", "Santa Ana", "Santa Rita", "Santo Tomas"],
  "Tarlac": ["Tarlac City", "Anao", "Bamban", "Camiling", "Capas", "Concepcion", "Gerona", "La Paz", "Mayantoc", "Moncada", "Paniqui", "Pura", "Ramos", "San Clemente", "San Manuel", "Santa Ignacia", "Victoria"],
  "Zambales": ["Olongapo City", "Botolan", "Cabangan", "Candelaria", "Castillejos", "Iba", "Masinloc", "Palauig", "San Antonio", "San Felipe", "San Marcelino", "San Narciso", "Santa Cruz", "Subic"],

  // Region IV-A - CALABARZON
  "Batangas": ["Batangas City", "Lipa City", "Tanauan City", "Agoncillo", "Alitagtag", "Balayan", "Balete", "Bauan", "Calaca", "Calatagan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", "Mataas na Kahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Santo Tomas", "Taal", "Talisay", "Taysan", "Tingloy", "Tuy"],
  "Southern Leyte": ["Maasin City", "Anahawan", "Bontoc", "Hinunangan", "Hinundayan", "Libagon", "Liloan", "Limasawa", "Macrohon", "Malitbog", "Padre Burgos", "Pintuyan", "Saint Bernard", "San Francisco", "San Juan", "San Ricardo", "Silago", "Sogod", "Tomas Oppus"],

  // NIR - Negros Island Region
  "Negros del Norte": [],

  // Region IX - Zamboanga Peninsula
  "Zamboanga del Norte": ["Dapitan City", "Dipolog City", "Baliguian", "Godod", "Gutalac", "Jose Dalman", "Kalawit", "Katipunan", "La Libertad", "Labason", "Leon B. Postigo", "Liloy", "Manukan", "Mutia", "Piñan", "Polanco", "Pres. Manuel A. Roxas", "Rizal", "Salug", "Sergio Osmeña Sr.", "Siayan", "Sibuco", "Sibutad", "Sindangan", "Siocon", "Sirawai", "Tampilisan"],
  "Zamboanga del Sur": ["Pagadian City", "Zamboanga City", "Aurora", "Bayog", "Dimataling", "Dinas", "Dumalinao", "Dumingag", "Guipos", "Josefina", "Kumalarang", "Labangan", "Lakewood", "Lapuyan", "Mahayag", "Margosatubig", "Midsalip", "Molave", "Pitogo", "Ramon Magsaysay", "San Miguel", "San Pablo", "Sominot", "Tabina", "Tambulig", "Tigbao", "Tukuran", "Vincenzo A. Sagun"],
  "Zamboanga Sibugay": ["Alicia", "Buug", "Diplahan", "Imelda", "Ipil", "Kabasalan", "Mabuhay", "Malangas", "Naga", "Olutanga", "Payao", "Roseller Lim", "Siay", "Talusan", "Titay", "Tungawan"],

  // Region X - Northern Mindanao
  "Bukidnon": ["Malaybalay City", "Valencia City", "Baungon", "Cabanglasan", "Damulog", "Dangcagan", "Don Carlos", "Impasugong", "Kadingilan", "Kalilangan", "Kibawe", "Kitaotao", "Lantapan", "Libona", "Malitbog", "Manolo Fortich", "Maramag", "Pangantucan", "Quezon", "San Fernando", "Sumilao", "Talakag"],
  "Camiguin": ["Catarman", "Guinsiliban", "Mahinog", "Mambajao", "Sagay"],
  "Lanao del Norte": ["Iligan City", "Bacolod", "Baloi", "Baroy", "Kapatagan", "Kauswagan", "Kolambugan", "Lala", "Linamon", "Magsaysay", "Maigo", "Matungao", "Munai", "Nunungan", "Pantao Ragat", "Pantar", "Poona Piagapo", "Salvador", "Sapad", "Sultan Naga Dimaporo", "Tagoloan", "Tangcal", "Tubod"],
  "Misamis Occidental": ["Oroquieta City", "Ozamis City", "Tangub City", "Aloran", "Baliangao", "Bonifacio", "Calamba", "Clarin", "Concepcion", "Don Victoriano Chiongson", "Jimenez", "Lopez Jaena", "Panaon", "Plaridel", "Sapang Dalaga", "Sinacaban", "Tudela"],
  "Misamis Oriental": ["Cagayan de Oro City", "Gingoog City", "Alubijid", "Balingasag", "Balingoan", "Binuangan", "Claveria", "El Salvador", "Gitagum", "Initao", "Jasaan", "Kinoguitan", "Lagonglong", "Laguindingan", "Libertad", "Lugait", "Magsaysay", "Manticao", "Medina", "Naawan", "Opol", "Salay", "Sugbongcogon", "Tagoloan", "Talisayan", "Villanueva"],

  // Region XI - Davao Region
  "Davao de Oro": ["Compostela", "Laak", "Mabini", "Maco", "Maragusan", "Mawab", "Monkayo", "Montevista", "Nabunturan", "New Bataan", "Pantukan"],
  "Davao del Norte": ["Panabo City", "Samal City", "Tagum City", "Asuncion", "Braulio E. Dujali", "Carmen", "Kapalong", "New Corella", "San Isidro", "Santo Tomas", "Talaingod"],
  "Davao del Sur": ["Davao City", "Digos City", "Bansalan", "Don Marcelino", "Hagonoy", "Jose Abad Santos", "Kiblawan", "Magsaysay", "Malalag", "Matanao", "Padada", "Santa Cruz", "Sulop"],
  "Davao Occidental": ["Don Marcelino", "Jose Abad Santos", "Malita", "Santa Maria", "Sarangani"],
  "Davao Oriental": ["Mati City", "Baganga", "Banaybanay", "Boston", "Caraga", "Cateel", "Governor Generoso", "Lupon", "Manay", "San Isidro", "Tarragona"],

  // Region XII - SOCCSKSARGEN
  "Cotabato": ["Kidapawan City", "Alamada", "Aleosan", "Antipas", "Arakan", "Banisilan", "Carmen", "Kabacan", "Libungan", "M'lang", "Magpet", "Makilala", "Matalam", "Midsayap", "Pigcawayan", "Pikit", "President Roxas", "Tulunan"],
  "Sarangani": ["Alabel", "Glan", "Kiamba", "Maasim", "Maitum", "Malapatan", "Malungon"],
  "South Cotabato": ["General Santos City", "Koronadal City", "Banga", "Lake Sebu", "Norala", "Polomolok", "Santo Niño", "Surallah", "T'boli", "Tampakan", "Tantangan", "Tupi"],
  "Sultan Kudarat": ["Tacurong City", "Bagumbayan", "Columbio", "Esperanza", "Isulan", "Kalamansig", "Lambayong", "Lebak", "Lutayan", "Palimbang", "President Quirino", "Senator Ninoy Aquino"],

  // Region XIII - Caraga
  "Agusan del Norte": ["Butuan City", "Cabadbaran City", "Buenavista", "Carmen", "Jabonga", "Kitcharao", "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Santiago", "Tubay"],
  "Agusan del Sur": ["Bayugan City", "Bunawan", "Esperanza", "La Paz", "Loreto", "Prosperidad", "Rosario", "San Francisco", "San Luis", "Santa Josefa", "Sibagat", "Talacogon", "Trento", "Veruela"],
  "Dinagat Islands": ["Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "San Jose", "Tubajon"],
  "Surigao del Norte": ["Surigao City", "Alegria", "Bacuag", "Burgos", "Claver", "Dapa", "Del Carmen", "General Luna", "Gigaquit", "Mainit", "Malimono", "Pilar", "Placer", "San Benito", "San Francisco", "San Isidro", "Santa Monica", "Sison", "Socorro", "Tagana-an", "Tubod"],
  "Surigao del Sur": ["Tandag City", "Bislig City", "Barobo", "Bayabas", "Cagwait", "Cantilan", "Carmen", "Carrascal", "Cortes", "Hinatuan", "Lanuza", "Lianga", "Lingig", "Madrid", "Marihatag", "San Agustin", "San Miguel", "Tagbina", "Tago"],

  // BARMM - Bangsamoro Autonomous Region in Muslim Mindanao
  "Basilan": ["Isabela City", "Lamitan City", "Akbar", "Al-Barka", "Hadji Mohammad Ajul", "Hadji Muhtamad", "Lantawan", "Maluso", "Sumisip", "Tabuan-Lasa", "Tipo-Tipo", "Tuburan", "Ungkaya Pukan"],
  "Lanao del Sur": ["Marawi City", "Amai Manabilang", "Bacolod-Kalawi", "Balabagan", "Balindong", "Bayang", "Binidayan", "Buadiposo-Buntong", "Bubong", "Butig", "Calanogas", "Ditsaan-Ramain", "Ganassi", "Kapai", "Kapatagan", "Lumba-Bayabao", "Lumbaca-Unayan", "Lumbatan", "Lumbayanague", "Madalum", "Madamba", "Maguing", "Malabang", "Marantao", "Marogong", "Masiu", "Mulondo", "Pagayawan", "Piagapo", "Picong", "Poona Bayabao", "Pualas", "Saguiaran", "Sultan Dumalondong", "Tagoloan II", "Tamparan", "Taraka", "Tubaran", "Tugaya", "Wao"],
  "Maguindanao del Norte": ["Barira", "Buldon", "Datu Blah T. Sinsuat", "Kabuntalan", "Matanog", "Northern Kabuntalan", "Parang", "Sultan Kudarat", "Sultan Mastura"],
  "Maguindanao del Sur": ["Buluan", "Datu Abdullah Sangki", "Datu Anggal Midtimbang", "Datu Hoffer Ampatuan", "Datu Montawal", "Datu Paglas", "Datu Piang", "Datu Salibo", "Datu Saudi-Ampatuan", "Datu Unsay", "General Salipada K. Pendatun", "Guindulungan", "Mangudadatu", "Pandag", "Rajah Buayan", "Shariff Aguak", "Shariff Saydona Mustapha", "South Upi", "Sultan sa Barongis", "Talayan", "Talitay", "Upi"],
  "Sulu": ["Jolo City", "Banguingui", "Hadji Panglima Tahil", "Indanan", "Kalingalan Caluang", "Lugus", "Luuk", "Maimbung", "Old Panamao", "Omar", "Pandami", "Panglima Estino", "Pangutaran", "Parang", "Pata", "Patikul", "Siasi", "Talipao", "Tapul"],
  "Tawi-Tawi": ["Bongao City", "Balimbing", "Barangay Simunul", "Languyan", "Mapun", "Panglima Sugala", "Sapa-Sapa", "Sibutu", "Sitangkai", "South Ubian", "Tandubas", "Turtle Islands"]
};

export const islandRegionMap: Record<string, string[]> = {
  "Luzon": ["I", "II", "III", "IV-A", "V", "CAR", "IV-B"],
  "Visayas": ["VI", "VII", "VIII", "NIR"],
  "Mindanao": ["IX", "X", "XI", "XII", "XIII", "BARMM I", "BARMM II"],
};

// Complete map of regions to provinces
