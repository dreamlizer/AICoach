"use client";

import { FontFamilyOption, PersistedState, ProvinceProfile, ThemePreset, WorldCountryProfile } from "./types";

export const chinaGeoJson = { type: "FeatureCollection", features: [] as any[] };
export const worldGeoJson = { type: "FeatureCollection", features: [] as any[] };
export const CHINA_GEOJSON_URL = "/geo/china.100000_full.json";
export const WORLD_GEOJSON_URL = "/geo/world.geo.json";
const CHINA_GEOJSON_FALLBACK_URLS = [
  "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
];
const WORLD_GEOJSON_FALLBACK_URLS = [
  "https://fastly.jsdelivr.net/npm/geojson-world-map@0.0.2/lib/world.json",
  "https://cdn.jsdelivr.net/npm/geojson-world-map@0.0.2/lib/world.json"
];

export const MIN_MAP_ZOOM = 0.7;
export const MAX_MAP_ZOOM = 5;

export const DEFAULT_STATE: PersistedState = {
  selectedNames: [],
  labelLanguage: "zh",
  highlightColor: "#D77A9A",
  baseColor: "#D9D5DC",
  borderColor: "#FFFFFF",
  hoverColor: "#F1C7D5",
  fontColor: "#2B1D27",
  fontSize: 11,
  fontWeight: 600,
  fontFamily: '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif',
  themeId: "gold-slate",
  mapZoom: 1.05,
  showMarineLabels: true
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: "gold-slate", name: "鎏金灰", highlightColor: "#F59E0B", baseColor: "#C7CCD4", borderColor: "#FFFFFF", hoverColor: "#FDE7B3" },
  { id: "ocean-cyan", name: "深海蓝", highlightColor: "#22D3EE", baseColor: "#CBD5E1", borderColor: "#0F172A", hoverColor: "#D5F8FF" },
  { id: "jade-ink", name: "青瓷绿", highlightColor: "#10B981", baseColor: "#D1D5DB", borderColor: "#1F2937", hoverColor: "#D9FBEF" },
  { id: "violet-mist", name: "暮山紫", highlightColor: "#8B5CF6", baseColor: "#D4D4D8", borderColor: "#312E81", hoverColor: "#EDE4FF" },
  { id: "ember-night", name: "极夜橙", highlightColor: "#FB923C", baseColor: "#9CA3AF", borderColor: "#111827", hoverColor: "#FFE6D3" }
];

export const COLOR_SWATCHES = {
  highlight: ["#F59E0B", "#22D3EE", "#10B981", "#8B5CF6", "#FB7185", "#F97316"],
  base: ["#E5E7EB", "#D1D5DB", "#CBD5E1", "#E2E8F0", "#D4D4D8", "#C7CCD4"],
  border: ["#FFFFFF", "#0F172A", "#1F2937", "#312E81", "#0B3B4D", "#2F2F2F"],
  hover: ["#FDBA74", "#67E8F9", "#34D399", "#A78BFA", "#FB7185", "#FCD34D"]
};

export const FONT_FAMILIES: FontFamilyOption[] = [
  { label: "系统黑体", value: '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif' },
  { label: "宋体", value: '"SimSun","Songti SC",serif' },
  { label: "思源黑体", value: '"Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif' },
  { label: "苹方", value: '"PingFang SC","Helvetica Neue",sans-serif' }
];

export const FONT_COLOR_SWATCHES = ["#2B1D27", "#6D4F96", "#7B394E", "#526748", "#B75D3C", "#334155"];

export const REGION_EN_MAP: Record<string, string> = {
  北京: "Beijing",
  天津: "Tianjin",
  上海: "Shanghai",
  重庆: "Chongqing",
  河北: "Hebei",
  河南: "Henan",
  云南: "Yunnan",
  辽宁: "Liaoning",
  黑龙江: "Heilongjiang",
  湖南: "Hunan",
  安徽: "Anhui",
  山东: "Shandong",
  新疆: "Xinjiang",
  江苏: "Jiangsu",
  浙江: "Zhejiang",
  江西: "Jiangxi",
  湖北: "Hubei",
  广西: "Guangxi",
  甘肃: "Gansu",
  山西: "Shanxi",
  内蒙古: "Inner Mongolia",
  陕西: "Shaanxi",
  吉林: "Jilin",
  福建: "Fujian",
  贵州: "Guizhou",
  广东: "Guangdong",
  青海: "Qinghai",
  西藏: "Tibet",
  四川: "Sichuan",
  宁夏: "Ningxia",
  海南: "Hainan",
  台湾: "Taiwan",
  香港: "Hong Kong",
  澳门: "Macau"
};

export const PROVINCE_INFO: Record<string, ProvinceProfile> = {
  北京: { capital: "北京", area: "1.64万 km²", population: "2185万", gdp: "4.38万亿元", populationRank: "26", gdpRank: "13" },
  天津: { capital: "天津", area: "1.19万 km²", population: "1364万", gdp: "1.67万亿元", populationRank: "30", gdpRank: "17" },
  河北: { capital: "石家庄", area: "18.88万 km²", population: "7393万", gdp: "4.39万亿元", populationRank: "6", gdpRank: "12" },
  山西: { capital: "太原", area: "15.67万 km²", population: "3447万", gdp: "2.57万亿元", populationRank: "19", gdpRank: "20" },
  内蒙古: { capital: "呼和浩特", area: "118.3万 km²", population: "2396万", gdp: "2.46万亿元", populationRank: "23", gdpRank: "21" },
  辽宁: { capital: "沈阳", area: "14.8万 km²", population: "4259万", gdp: "3.03万亿元", populationRank: "14", gdpRank: "16" },
  吉林: { capital: "长春", area: "18.74万 km²", population: "2348万", gdp: "1.35万亿元", populationRank: "24", gdpRank: "24" },
  黑龙江: { capital: "哈尔滨", area: "47.3万 km²", population: "3062万", gdp: "1.65万亿元", populationRank: "20", gdpRank: "18" },
  上海: { capital: "上海", area: "0.63万 km²", population: "2488万", gdp: "4.72万亿元", populationRank: "22", gdpRank: "11" },
  江苏: { capital: "南京", area: "10.72万 km²", population: "8526万", gdp: "12.82万亿元", populationRank: "4", gdpRank: "2" },
  浙江: { capital: "杭州", area: "10.55万 km²", population: "6627万", gdp: "8.26万亿元", populationRank: "9", gdpRank: "4" },
  安徽: { capital: "合肥", area: "14.01万 km²", population: "6121万", gdp: "4.71万亿元", populationRank: "10", gdpRank: "10" },
  福建: { capital: "福州", area: "12.4万 km²", population: "4183万", gdp: "5.43万亿元", populationRank: "15", gdpRank: "8" },
  江西: { capital: "南昌", area: "16.69万 km²", population: "4518万", gdp: "3.22万亿元", populationRank: "13", gdpRank: "15" },
  山东: { capital: "济南", area: "15.79万 km²", population: "10123万", gdp: "9.20万亿元", populationRank: "2", gdpRank: "3" },
  河南: { capital: "郑州", area: "16.7万 km²", population: "9815万", gdp: "6.14万亿元", populationRank: "3", gdpRank: "5" },
  湖北: { capital: "武汉", area: "18.59万 km²", population: "5838万", gdp: "5.58万亿元", populationRank: "11", gdpRank: "7" },
  湖南: { capital: "长沙", area: "21.18万 km²", population: "6568万", gdp: "5.00万亿元", populationRank: "8", gdpRank: "9" },
  广东: { capital: "广州", area: "17.98万 km²", population: "12706万", gdp: "13.57万亿元", populationRank: "1", gdpRank: "1" },
  广西: { capital: "南宁", area: "23.76万 km²", population: "5027万", gdp: "2.72万亿元", populationRank: "12", gdpRank: "19" },
  海南: { capital: "海口", area: "3.54万 km²", population: "1043万", gdp: "0.76万亿元", populationRank: "31", gdpRank: "28" },
  重庆: { capital: "重庆", area: "8.24万 km²", population: "3213万", gdp: "3.01万亿元", populationRank: "18", gdpRank: "14" },
  四川: { capital: "成都", area: "48.6万 km²", population: "8368万", gdp: "6.00万亿元", populationRank: "5", gdpRank: "6" },
  贵州: { capital: "贵阳", area: "17.62万 km²", population: "3865万", gdp: "2.09万亿元", populationRank: "17", gdpRank: "22" },
  云南: { capital: "昆明", area: "39.41万 km²", population: "4673万", gdp: "2.89万亿元", populationRank: "16", gdpRank: "13" },
  西藏: { capital: "拉萨", area: "122.84万 km²", population: "364万", gdp: "0.24万亿元", populationRank: "34", gdpRank: "31" },
  陕西: { capital: "西安", area: "20.56万 km²", population: "3956万", gdp: "3.37万亿元", populationRank: "16", gdpRank: "14" },
  甘肃: { capital: "兰州", area: "42.58万 km²", population: "2465万", gdp: "1.18万亿元", populationRank: "22", gdpRank: "25" },
  青海: { capital: "西宁", area: "72.23万 km²", population: "595万", gdp: "0.40万亿元", populationRank: "33", gdpRank: "30" },
  宁夏: { capital: "银川", area: "6.64万 km²", population: "729万", gdp: "0.55万亿元", populationRank: "32", gdpRank: "29" },
  新疆: { capital: "乌鲁木齐", area: "166万 km²", population: "2587万", gdp: "1.92万亿元", populationRank: "21", gdpRank: "23" },
  台湾: { capital: "台北", area: "3.6万 km²", population: "2330万", gdp: "约5.3万亿元", populationRank: "24", gdpRank: "约9" },
  香港: { capital: "香港", area: "1114 km²", population: "750万", gdp: "约2.8万亿元", populationRank: "32", gdpRank: "约16" },
  澳门: { capital: "澳门", area: "33 km²", population: "68万", gdp: "约0.33万亿元", populationRank: "34", gdpRank: "约30" }
};

export const WORLD_COUNTRY_INFO: Record<string, WorldCountryProfile> = {
  China: { capital: "Beijing", area: "960万 km²", population: "14.10亿", gdp: "17.89万亿美元", populationRank: "2", gdpRank: "2", timezone: "Asia/Shanghai" },
  "United States": { capital: "Washington, D.C.", area: "983万 km²", population: "3.34亿", gdp: "27.36万亿美元", populationRank: "3", gdpRank: "1", timezone: "America/New_York" },
  "United States of America": { capital: "Washington, D.C.", area: "983万 km²", population: "3.34亿", gdp: "27.36万亿美元", populationRank: "3", gdpRank: "1", timezone: "America/New_York" },
  India: { capital: "New Delhi", area: "328万 km²", population: "14.29亿", gdp: "3.57万亿美元", populationRank: "1", gdpRank: "5", timezone: "Asia/Kolkata" },
  Japan: { capital: "Tokyo", area: "37.8万 km²", population: "1.23亿", gdp: "4.21万亿美元", populationRank: "12", gdpRank: "4", timezone: "Asia/Tokyo" },
  Germany: { capital: "Berlin", area: "35.8万 km²", population: "8436万", gdp: "4.52万亿美元", populationRank: "19", gdpRank: "3", timezone: "Europe/Berlin" },
  France: { capital: "Paris", area: "64.3万 km²", population: "6800万", gdp: "3.05万亿美元", populationRank: "22", gdpRank: "7", timezone: "Europe/Paris" },
  "United Kingdom": { capital: "London", area: "24.3万 km²", population: "6770万", gdp: "3.39万亿美元", populationRank: "21", gdpRank: "6", timezone: "Europe/London" },
  Brazil: { capital: "Brasília", area: "851万 km²", population: "2.16亿", gdp: "2.17万亿美元", populationRank: "7", gdpRank: "9", timezone: "America/Sao_Paulo" },
  Russia: { capital: "Moscow", area: "1709万 km²", population: "1.44亿", gdp: "2.02万亿美元", populationRank: "9", gdpRank: "11", timezone: "Europe/Moscow" },
  Canada: { capital: "Ottawa", area: "998万 km²", population: "4020万", gdp: "2.14万亿美元", populationRank: "38", gdpRank: "10", timezone: "America/Toronto" },
  Australia: { capital: "Canberra", area: "769万 km²", population: "2660万", gdp: "1.72万亿美元", populationRank: "55", gdpRank: "13", timezone: "Australia/Sydney" },
  Mexico: { capital: "Mexico City", area: "196万 km²", population: "1.29亿", gdp: "1.81万亿美元", populationRank: "10", gdpRank: "12", timezone: "America/Mexico_City" },
  Indonesia: { capital: "Jakarta", area: "191万 km²", population: "2.77亿", gdp: "1.39万亿美元", populationRank: "4", gdpRank: "16", timezone: "Asia/Jakarta" },
  Turkey: { capital: "Ankara", area: "78.3万 km²", population: "8537万", gdp: "1.12万亿美元", populationRank: "18", gdpRank: "17", timezone: "Europe/Istanbul" },
  "Saudi Arabia": { capital: "Riyadh", area: "215万 km²", population: "3640万", gdp: "1.11万亿美元", populationRank: "41", gdpRank: "18", timezone: "Asia/Riyadh" },
  "South Africa": { capital: "Pretoria", area: "122万 km²", population: "6200万", gdp: "0.40万亿美元", populationRank: "24", gdpRank: "32", timezone: "Africa/Johannesburg" }
};

export const WORLD_COUNTRY_TIMEZONE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(WORLD_COUNTRY_INFO).map(([name, info]) => [name, info.timezone])
);

export const WORLD_DATA_SOURCE_TEXT = "World Bank Data (Population / GDP), Snapshot: 2024";

export const WORLD_COUNTRY_ZH_MAP: Record<string, string> = {
  China: "中国",
  "United States": "美国",
  "United States of America": "美国",
  India: "印度",
  Japan: "日本",
  Germany: "德国",
  France: "法国",
  "United Kingdom": "英国",
  Brazil: "巴西",
  Russia: "俄罗斯",
  Canada: "加拿大",
  Australia: "澳大利亚",
  Mexico: "墨西哥",
  Indonesia: "印度尼西亚",
  Turkey: "土耳其",
  "Saudi Arabia": "沙特阿拉伯",
  "South Africa": "南非",
  Italy: "意大利",
  Spain: "西班牙",
  Argentina: "阿根廷",
  Kazakhstan: "哈萨克斯坦",
  Mongolia: "蒙古",
  Greenland: "格陵兰",
  "South Korea": "韩国",
  "North Korea": "朝鲜",
  Ukraine: "乌克兰",
  Egypt: "埃及",
  Iran: "伊朗",
  Iraq: "伊拉克",
  Afghanistan: "阿富汗",
  Albania: "阿尔巴尼亚",
  Algeria: "阿尔及利亚",
  Angola: "安哥拉",
  Armenia: "亚美尼亚",
  Austria: "奥地利",
  Azerbaijan: "阿塞拜疆",
  Bahamas: "巴哈马",
  Bangladesh: "孟加拉国",
  Belarus: "白俄罗斯",
  Belgium: "比利时",
  Belize: "伯利兹",
  Benin: "贝宁",
  Bhutan: "不丹",
  Bolivia: "玻利维亚",
  Botswana: "博茨瓦纳",
  Bulgaria: "保加利亚",
  Burundi: "布隆迪",
  Cambodia: "柬埔寨",
  Cameroon: "喀麦隆",
  Chad: "乍得",
  Chile: "智利",
  Colombia: "哥伦比亚",
  "Costa Rica": "哥斯达黎加",
  Croatia: "克罗地亚",
  Cuba: "古巴",
  Cyprus: "塞浦路斯",
  Denmark: "丹麦",
  Djibouti: "吉布提",
  Ecuador: "厄瓜多尔",
  Eritrea: "厄立特里亚",
  Estonia: "爱沙尼亚",
  Ethiopia: "埃塞俄比亚",
  Finland: "芬兰",
  Gabon: "加蓬",
  Gambia: "冈比亚",
  Georgia: "格鲁吉亚",
  Ghana: "加纳",
  Greece: "希腊",
  Guatemala: "危地马拉",
  Guinea: "几内亚",
  Guyana: "圭亚那",
  Haiti: "海地",
  Honduras: "洪都拉斯",
  Hungary: "匈牙利",
  Iceland: "冰岛",
  Ireland: "爱尔兰",
  Israel: "以色列",
  Jamaica: "牙买加",
  Jordan: "约旦",
  Kenya: "肯尼亚",
  Kuwait: "科威特",
  Kyrgyzstan: "吉尔吉斯斯坦",
  Laos: "老挝",
  Latvia: "拉脱维亚",
  Lebanon: "黎巴嫩",
  Lesotho: "莱索托",
  Liberia: "利比里亚",
  Libya: "利比亚",
  Lithuania: "立陶宛",
  Luxembourg: "卢森堡",
  Madagascar: "马达加斯加",
  Malawi: "马拉维",
  Mali: "马里",
  Mauritania: "毛里塔尼亚",
  Moldova: "摩尔多瓦",
  Montenegro: "黑山",
  Morocco: "摩洛哥",
  Mozambique: "莫桑比克",
  Myanmar: "缅甸",
  Namibia: "纳米比亚",
  Nepal: "尼泊尔",
  Netherlands: "荷兰",
  Nicaragua: "尼加拉瓜",
  Niger: "尼日尔",
  Nigeria: "尼日利亚",
  Norway: "挪威",
  Oman: "阿曼",
  Pakistan: "巴基斯坦",
  Panama: "巴拿马",
  Paraguay: "巴拉圭",
  Peru: "秘鲁",
  Poland: "波兰",
  Portugal: "葡萄牙",
  Qatar: "卡塔尔",
  Romania: "罗马尼亚",
  Rwanda: "卢旺达",
  Senegal: "塞内加尔",
  Serbia: "塞尔维亚",
  "Sierra Leone": "塞拉利昂",
  Slovakia: "斯洛伐克",
  Slovenia: "斯洛文尼亚",
  Somalia: "索马里",
  "South Sudan": "南苏丹",
  Sudan: "苏丹",
  Suriname: "苏里南",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  Syria: "叙利亚",
  Tajikistan: "塔吉克斯坦",
  Tanzania: "坦桑尼亚",
  Togo: "多哥",
  Tunisia: "突尼斯",
  Turkmenistan: "土库曼斯坦",
  Uganda: "乌干达",
  Uruguay: "乌拉圭",
  Uzbekistan: "乌兹别克斯坦",
  Venezuela: "委内瑞拉",
  Yemen: "也门",
  Zambia: "赞比亚",
  Zimbabwe: "津巴布韦",
  "Democratic Republic of the Congo": "刚果（金）",
  "Central African Republic": "中非共和国",
  "Equatorial Guinea": "赤道几内亚",
  "Western Sahara": "西撒哈拉",
  "Bosnia and Herzegovina": "波黑",
  "Dominican Republic": "多米尼加",
  "Solomon Islands": "所罗门群岛",
  "Northern Cyprus": "北塞浦路斯",
  "Falkland Islands": "福克兰群岛",
  "British Indian Ocean Territory": "英属印度洋领地",
  "Cayman Islands": "开曼群岛",
  "Faroe Islands": "法罗群岛",
  "Northern Mariana Islands": "北马里亚纳群岛",
  "South Georgia and the South Sandwich Islands": "南乔治亚和南桑威奇群岛",
  "Saint Pierre and Miquelon": "圣皮埃尔和密克隆",
  "Saint Vincent and the Grenadines": "圣文森特和格林纳丁斯",
  "Turks and Caicos Islands": "特克斯和凯科斯群岛",
  "United States Virgin Islands": "美属维尔京群岛",
  "Heard Island and McDonald Islands": "赫德岛和麦克唐纳群岛",
  "French Southern and Antarctic Lands": "法属南方和南极领地",
  "Åland Islands": "奥兰群岛",
  "Antigua and Barbuda": "安提瓜和巴布达",
  "French Polynesia": "法属波利尼西亚",
  "Cape Verde": "佛得角",
  "Cabo Verde": "佛得角",
  "Curaçao": "库拉索",
  "Comoros": "科摩罗",
  "Dominica": "多米尼克",
  "Isle of Man": "马恩岛",
  "Jersey": "泽西岛",
  "Micronesia": "密克罗尼西亚",
  "Montserrat": "蒙特塞拉特",
  "New Caledonia": "新喀里多尼亚",
  "Niue": "纽埃",
  "Palestine": "巴勒斯坦",
  "Puerto Rico": "波多黎各",
  "Saint Helena": "圣赫勒拿",
  "Saint Lucia": "圣卢西亚",
  "Samoa": "萨摩亚",
  "Seychelles": "塞舌尔",
  "Siachen Glacier": "锡亚琴冰川",
  "American Samoa": "美属萨摩亚",
  "Andorra": "安道尔",
  "Bahrain": "巴林",
  "Barbados": "巴巴多斯",
  "Bermuda": "百慕大",
  "Brunei": "文莱",
  "Congo": "刚果（布）",
  "Republic of the Congo": "刚果（布）",
  "El Salvador": "萨尔瓦多",
  "Fiji": "斐济",
  "Guam": "关岛",
  "Guinea-Bissau": "几内亚比绍",
  "Kiribati": "基里巴斯",
  "Malta": "马耳他",
  "Mauritius": "毛里求斯",
  "Palau": "帕劳",
  "Papua New Guinea": "巴布亚新几内亚",
  "Sri Lanka": "斯里兰卡",
  "Tonga": "汤加",
  "Trinidad and Tobago": "特立尼达和多巴哥",
  "Vanuatu": "瓦努阿图",
  "São Tomé and Príncipe": "圣多美和普林西比",
  "Swaziland": "斯威士兰",
  "Eswatini": "斯威士兰",
  "Côte d'Ivoire": "科特迪瓦",
  "Ivory Coast": "科特迪瓦",
  "Burkina Faso": "布基纳法索",
  "Grenada": "格林纳达",
  "Liechtenstein": "列支敦士登",
  "East Timor": "东帝汶",
  "United Arab Emirates": "阿拉伯联合酋长国",
  "Czechia": "捷克",
  "North Macedonia": "北马其顿",
  Thailand: "泰国",
  Vietnam: "越南",
  Philippines: "菲律宾",
  Malaysia: "马来西亚",
  Singapore: "新加坡",
  "New Zealand": "新西兰"
};

const WORLD_CAPITAL_ZH_MAP: Record<string, string> = {
  Beijing: "北京",
  "Washington, D.C.": "华盛顿",
  "Washington DC": "华盛顿",
  "New Delhi": "新德里",
  Tokyo: "东京",
  Berlin: "柏林",
  Paris: "巴黎",
  London: "伦敦",
  Brasília: "巴西利亚",
  Brasilia: "巴西利亚",
  Moscow: "莫斯科",
  Ottawa: "渥太华",
  Canberra: "堪培拉",
  Cairo: "开罗",
  Pretoria: "比勒陀利亚",
  Abuja: "阿布贾",
  Nairobi: "内罗毕",
  Khartoum: "喀土穆",
  "Addis Ababa": "亚的斯亚贝巴",
  "Kabul": "喀布尔",
  "Yerevan": "埃里温",
  "Baku": "巴库",
  "Dhaka": "达卡",
  "Brussels": "布鲁塞尔",
  "Porto-Novo": "波多诺伏",
  "Gaborone": "哈博罗内",
  "Ouagadougou": "瓦加杜古",
  "Bujumbura": "布琼布拉",
  "Phnom Penh": "金边",
  "Yaoundé": "雅温得",
  "Yaounde": "雅温得",
  "Bangui": "班吉",
  "N'Djamena": "恩贾梅纳",
  "Ndjamena": "恩贾梅纳",
  "San José": "圣何塞",
  "San Jose": "圣何塞",
  "Zagreb": "萨格勒布",
  "Havana": "哈瓦那",
  "Prague": "布拉格",
  "Copenhagen": "哥本哈根",
  "Djibouti": "吉布提",
  "Quito": "基多",
  "Asmara": "阿斯马拉",
  "Tallinn": "塔林",
  "Helsinki": "赫尔辛基",
  "Libreville": "利伯维尔",
  "Banjul": "班珠尔",
  "Tbilisi": "第比利斯",
  "Accra": "阿克拉",
  "Athens": "雅典",
  "Guatemala City": "危地马拉城",
  "Conakry": "科纳克里",
  "Georgetown": "乔治敦",
  "Port-au-Prince": "太子港",
  "Budapest": "布达佩斯",
  "Reykjavík": "雷克雅未克",
  "Reykjavik": "雷克雅未克",
  "Tehran": "德黑兰",
  "Baghdad": "巴格达",
  "Dublin": "都柏林",
  "Jerusalem": "耶路撒冷",
  "Rome": "罗马",
  "Kingston": "金斯敦",
  "Amman": "安曼",
  "Nur-Sultan": "阿斯塔纳",
  "Astana": "阿斯塔纳",
  "Kuwait City": "科威特城",
  "Bishkek": "比什凯克",
  "Vientiane": "万象",
  "Riga": "里加",
  "Beirut": "贝鲁特",
  "Maseru": "马塞卢",
  "Monrovia": "蒙罗维亚",
  "Tripoli": "的黎波里",
  "Vilnius": "维尔纽斯",
  "Luxembourg": "卢森堡",
  "Antananarivo": "塔那那利佛",
  "Lilongwe": "利隆圭",
  "Bamako": "巴马科",
  "Nouakchott": "努瓦克肖特",
  "Chișinău": "基希讷乌",
  "Chisinau": "基希讷乌",
  "Podgorica": "波德戈里察",
  "Rabat": "拉巴特",
  "Maputo": "马普托",
  "Naypyidaw": "内比都",
  "Windhoek": "温得和克",
  "Kathmandu": "加德满都",
  "Amsterdam": "阿姆斯特丹",
  "Managua": "马那瓜",
  "Niamey": "尼亚美",
  "Oslo": "奥斯陆",
  "Muscat": "马斯喀特",
  "Islamabad": "伊斯兰堡",
  "Panama": "巴拿马城",
  "Asunción": "亚松森",
  "Asuncion": "亚松森",
  "Lima": "利马",
  "Warsaw": "华沙",
  "Lisbon": "里斯本",
  "Doha": "多哈",
  "Bucharest": "布加勒斯特",
  "Kigali": "基加利",
  "Riyadh": "利雅得",
  "Dakar": "达喀尔",
  "Belgrade": "贝尔格莱德",
  "Freetown": "弗里敦",
  "Bratislava": "布拉迪斯拉发",
  "Ljubljana": "卢布尔雅那",
  "Mogadishu": "摩加迪沙",
  "Sri Jayawardenepura Kotte": "斯里贾亚瓦德纳普拉科特",
  "Stockholm": "斯德哥尔摩",
  "Bern": "伯尔尼",
  "Damascus": "大马士革",
  "Dushanbe": "杜尚别",
  "Dodoma": "多多马",
  "Lomé": "洛美",
  "Lome": "洛美",
  "Tunis": "突尼斯",
  "Ankara": "安卡拉",
  "Ashgabat": "阿什哈巴德",
  "Kampala": "坎帕拉",
  "Kyiv": "基辅",
  "Kiev": "基辅",
  "Montevideo": "蒙得维的亚",
  "Tashkent": "塔什干",
  "Caracas": "加拉加斯",
  "Hanoi": "河内",
  "Sana'a": "萨那",
  "Sanaa": "萨那",
  "Lusaka": "卢萨卡",
  "Harare": "哈拉雷",
  "Seoul": "首尔",
  "Pyongyang": "平壤",
  "Papeete": "帕皮提",
  "The Valley": "瓦利",
  "George Town": "乔治敦",
  "Praia": "普拉亚",
  "Willemstad": "威廉斯塔德",
  "Moroni": "莫罗尼",
  "Roseau": "罗索",
  "Douglas": "道格拉斯",
  "St. Helier": "圣赫利尔",
  "Palikir": "帕利基尔",
  "The Settlement": "布雷兹庄园",
  "Nouméa": "努美阿",
  "Noumea": "努美阿",
  "Alofi": "阿洛菲",
  "Jerusalem (claimed as capital by Israel)": "耶路撒冷",
  "San Juan": "圣胡安",
  "Jamestown": "詹姆斯敦",
  "Castries": "卡斯特里",
  "Apia": "阿皮亚",
  "Victoria": "维多利亚",
  "Mbabane": "姆巴巴内",
  "Yamoussoukro": "亚穆苏克罗",
  "Nicosia": "尼科西亚",
  "Road Town": "罗德城",
  "Pago Pago": "帕果帕果",
  "Andorra la Vella": "安道尔城",
  "Manama": "麦纳麦",
  "Bridgetown": "布里奇敦",
  "Hamilton": "哈密尔顿",
  "Bandar Seri Begawan": "斯里巴加湾市",
  "Brazzaville": "布拉柴维尔",
  "San Salvador": "圣萨尔瓦多",
  "Suva": "苏瓦",
  "Hagåtña": "阿加尼亚",
  "Hagatna": "阿加尼亚",
  "Bissau": "比绍",
  "South Tarawa": "南塔拉瓦",
  "Tarawa": "塔拉瓦",
  "Valletta": "瓦莱塔",
  "Port Louis": "路易港",
  "Ngerulmud": "恩吉鲁穆德",
  "Port Moresby": "莫尔兹比港",
  "Sri Jayawardenapura Kotte": "斯里贾亚瓦德纳普拉科特",
  "Nuku'alofa": "努库阿洛法",
  "Port of Spain": "西班牙港",
  "Port Vila": "维拉港",
  "São Tomé": "圣多美",
  "Sao Tome": "圣多美",
  "Nassau": "拿骚",
  "Belmopan": "贝尔莫潘",
  "Thimphu": "廷布",
  "Sucre": "苏克雷",
  "La Paz": "拉巴斯",
  "Sofia": "索菲亚",
  "Santiago": "圣地亚哥",
  "Bogotá": "波哥大",
  "Bogota": "波哥大",
  "Tegucigalpa": "特古西加尔巴",
  "Jakarta": "雅加达",
  "Ulaanbaatar": "乌兰巴托",
  "Ulan Bator": "乌兰巴托",
  "Manila": "马尼拉",
  "Paramaribo": "帕拉马里博",
  "Baku City": "巴库",
  "Yamoussoukro (official)": "亚穆苏克罗",
  "Taipei": "台北",
  "Skopje": "斯科普里",
  "Pristina": "普里什蒂纳",
  "Podgorica City": "波德戈里察",
  "Abu Dhabi": "阿布扎比",
  "Adamstown": "亚当斯敦",
  "Algiers": "阿尔及尔",
  "Avarua": "阿瓦鲁阿",
  "Bangkok": "曼谷",
  "Basse-Terre": "巴斯特尔",
  "Basseterre": "巴斯特尔",
  "Buenos Aires": "布宜诺斯艾利斯",
  "Cayenne": "卡宴",
  "Charlotte Amalie": "夏洛特阿马利亚",
  "City of San Marino": "圣马力诺市",
  "City of Victoria": "维多利亚市",
  "Ciudad de la Paz": "和平城",
  "Cockburn Town": "科伯恩城",
  "Diego Garcia": "迪戈加西亚",
  "Dili": "帝力",
  "El Aaiún": "阿尤恩",
  "El Aaiun": "阿尤恩",
  "Fakaofo": "法考福",
  "Flying Fish Cove": "飞鱼湾",
  "Fort-de-France": "法兰西堡",
  "Funafuti": "富纳富提",
  "Gibraltar": "直布罗陀",
  "Gitega": "基特加",
  "Gustavia": "古斯塔维亚",
  "Honiara": "霍尼亚拉",
  "Juba": "朱巴",
  "King Edward Point": "爱德华国王角",
  "Kingstown": "金斯敦",
  "Kinshasa": "金沙萨",
  "Kralendijk": "克拉伦代克",
  "Kuala Lumpur": "吉隆坡",
  "Longyearbyen": "朗伊尔城",
  "Luanda": "罗安达",
  "Madrid": "马德里",
  "Majuro": "马朱罗",
  "Malé": "马累",
  "Male": "马累",
  "Mamoudzou": "马穆楚",
  "Mariehamn": "玛丽港",
  "Marigot": "马里戈",
  "Mata-Utu": "马塔乌图",
  "Mexico City": "墨西哥城",
  "Minsk": "明斯克",
  "Monaco": "摩纳哥",
  "Nuuk": "努克",
  "Oranjestad": "奥拉涅斯塔德",
  "Panama City": "巴拿马城",
  "Philipsburg": "菲利普斯堡",
  "Plymouth": "普利茅斯",
  "Port-aux-Français": "法兰西港",
  "Port-aux-Francais": "法兰西港",
  "Ramallah": "拉姆安拉",
  "Saint Helier": "圣赫利尔",
  "Saint John's": "圣约翰",
  "Saint-Denis": "圣但尼",
  "Saint-Pierre": "圣皮埃尔",
  "Saipan": "塞班",
  "Santo Domingo": "圣多明各",
  "Sarajevo": "萨拉热窝",
  "Singapore": "新加坡",
  "St. George's": "圣乔治",
  "St. Peter Port": "圣彼得港",
  "Stanley": "斯坦利",
  "Tirana": "地拉那",
  "Tórshavn": "托尔斯港",
  "Torshavn": "托尔斯港",
  "Vaduz": "瓦杜兹",
  "Vatican City": "梵蒂冈城",
  "Vienna": "维也纳",
  "Wellington": "惠灵顿",
  "West Island": "西岛",
  "Yaren": "亚伦"
};

const normalizeCapitalName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-,'’()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const WORLD_CAPITAL_ZH_NORMALIZED_MAP: Record<string, string> = {};
Object.entries(WORLD_CAPITAL_ZH_MAP).forEach(([en, zh]) => {
  WORLD_CAPITAL_ZH_NORMALIZED_MAP[normalizeCapitalName(en)] = zh;
});

function normalizeWorldName(name: string) {
  return name.toLowerCase().replace(/[.\-,'’()]/g, " ").replace(/\s+/g, " ").trim();
}

const WORLD_NAME_ALIAS_TO_CANONICAL: Record<string, string> = {
  "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Central African Rep.": "Central African Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "S. Sudan": "South Sudan",
  "W. Sahara": "Western Sahara",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Dominican Rep.": "Dominican Republic",
  "Solomon Is.": "Solomon Islands",
  "N. Cyprus": "Northern Cyprus",
  "Falkland Is.": "Falkland Islands",
  "Fr. S. Antarctic Lands": "French Southern and Antarctic Lands",
  "Br. Indian Ocean Ter.": "British Indian Ocean Territory",
  "Cayman Is.": "Cayman Islands",
  "Faeroe Is.": "Faroe Islands",
  "N. Mariana Is.": "Northern Mariana Islands",
  "S. Geo. and S. Sandw. Is.": "South Georgia and the South Sandwich Islands",
  "St. Pierre and Miquelon": "Saint Pierre and Miquelon",
  "St. Vin. and Gren.": "Saint Vincent and the Grenadines",
  "Turks and Caicos Is.": "Turks and Caicos Islands",
  "U.S. Virgin Is.": "United States Virgin Islands",
  "Heard I. and McDonald Is.": "Heard Island and McDonald Islands",
  "Aland": "Åland Islands",
  "Antigua and Barb.": "Antigua and Barbuda",
  "Fr. Polynesia": "French Polynesia",
  "Cape Verde": "Cabo Verde",
  "Swaziland": "Eswatini",
  "Côte d'Ivoire": "Ivory Coast",
  "Congo": "Republic of the Congo",
  "Lao PDR": "Laos",
  "Czech Rep.": "Czechia",
  Macedonia: "North Macedonia",
  "Sao Tome and Principe": "São Tomé and Príncipe",
  "Timor-Leste": "East Timor",
  "Dem. Rep. Korea": "North Korea",
  "Korea": "South Korea"
};

const WORLD_ZH_BY_NORMALIZED_NAME: Record<string, string> = {};
const WORLD_POPULATION_BY_NORMALIZED_NAME: Record<string, number> = {};
const WORLD_AREA_BY_NORMALIZED_NAME: Record<string, number> = {};
const WORLD_CAPITAL_BY_NORMALIZED_NAME: Record<string, string> = {};

Object.entries(WORLD_COUNTRY_ZH_MAP).forEach(([enName, zhName]) => {
  WORLD_ZH_BY_NORMALIZED_NAME[normalizeWorldName(enName)] = zhName;
});

Object.entries(WORLD_NAME_ALIAS_TO_CANONICAL).forEach(([alias, canonical]) => {
  const canonicalNormalized = normalizeWorldName(canonical);
  const aliasNormalized = normalizeWorldName(alias);
  if (WORLD_POPULATION_BY_NORMALIZED_NAME[canonicalNormalized]) {
    WORLD_POPULATION_BY_NORMALIZED_NAME[aliasNormalized] =
      WORLD_POPULATION_BY_NORMALIZED_NAME[canonicalNormalized];
  }
  if (WORLD_AREA_BY_NORMALIZED_NAME[canonicalNormalized]) {
    WORLD_AREA_BY_NORMALIZED_NAME[aliasNormalized] =
      WORLD_AREA_BY_NORMALIZED_NAME[canonicalNormalized];
  }
  if (WORLD_CAPITAL_BY_NORMALIZED_NAME[canonicalNormalized]) {
    WORLD_CAPITAL_BY_NORMALIZED_NAME[aliasNormalized] =
      WORLD_CAPITAL_BY_NORMALIZED_NAME[canonicalNormalized];
  }
});

export const WORLD_LABEL_PRIORITY = new Set<string>([
  "United States",
  "China",
  "United States of America",
  "Russia",
  "India",
  "Brazil",
  "Canada",
  "Australia",
  "Greenland",
  "Mexico",
  "Argentina",
  "Saudi Arabia",
  "Kazakhstan",
  "Mongolia",
  "South Africa",
  "Japan",
  "Germany",
  "France",
  "United Kingdom",
  "Indonesia"
]);

const WORLD_COUNTRY_ALIAS: Record<string, string> = {
  "United States": "United States of America"
};

export function getWorldCountryCanonicalName(name: string) {
  return WORLD_COUNTRY_ALIAS[name] || WORLD_NAME_ALIAS_TO_CANONICAL[name] || name;
}

export function getWorldCountryZhName(name: string) {
  const canonical = getWorldCountryCanonicalName(name);
  const normalized = normalizeWorldName(canonical);
  return WORLD_ZH_BY_NORMALIZED_NAME[normalized] || WORLD_ZH_BY_NORMALIZED_NAME[normalizeWorldName(name)] || undefined;
}

export function getLocalizedWorldCapital(capital: string, language: "zh" | "en" | "none") {
  if (language !== "zh") return capital;
  const direct = WORLD_CAPITAL_ZH_MAP[capital];
  if (direct) return direct;
  return WORLD_CAPITAL_ZH_NORMALIZED_MAP[normalizeCapitalName(capital)] || capital;
}

function formatPopulationZh(population: number) {
  if (population >= 100000000) return `${(population / 100000000).toFixed(2)}亿`;
  if (population >= 10000) return `${Math.round(population / 10000)}万`;
  return `${population}`;
}

function formatAreaZh(area: number) {
  if (area >= 10000) return `${(area / 10000).toFixed(2)}万 km²`;
  return `${area} km²`;
}

const WORLD_POPULATION_RANK_MAP: Record<string, number> = (() => {
  const rows = Object.entries(WORLD_POPULATION_BY_NORMALIZED_NAME)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const rankMap: Record<string, number> = {};
  rows.forEach((item, index) => {
    rankMap[item.name] = index + 1;
  });
  return rankMap;
})();

const WORLD_COUNTRY_ID_BY_NORMALIZED_NAME: Record<string, string> = {};
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("United States")] = "US";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("United States of America")] = "US";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("China")] = "CN";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("Japan")] = "JP";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("Germany")] = "DE";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("France")] = "FR";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("United Kingdom")] = "GB";
WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName("India")] = "IN";

export function getWorldCountryIdByName(name: string) {
  const canonical = getWorldCountryCanonicalName(name);
  return (
    WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName(canonical)] ||
    WORLD_COUNTRY_ID_BY_NORMALIZED_NAME[normalizeWorldName(name)] ||
    null
  );
}

function getTimezoneByPoint(countryId: string | null, lng: number) {
  const oceanOffset = Math.max(-12, Math.min(14, Math.round(lng / 15)));
  if (countryId === "CN") {
    return { timezoneName: "Asia/Shanghai", mode: "iana" as const };
  }
  return {
    timezoneName: `UTC${oceanOffset >= 0 ? "+" : ""}${oceanOffset}`,
    mode: "offset" as const
  };
}

export function getWorldPointTimeInfo(countryName: string | null, lng: number, dateMs: number) {
  const canonicalName = countryName ? getWorldCountryCanonicalName(countryName) : null;
  if (canonicalName === "China") {
    const formatted = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(dateMs));
    return { timeText: formatted, timezoneText: "Asia/Shanghai" };
  }
  const countryId = canonicalName ? getWorldCountryIdByName(canonicalName) : null;
  const resolved = getTimezoneByPoint(countryId, lng);
  if (resolved.mode === "iana") {
    const formatted = new Intl.DateTimeFormat("zh-CN", {
      timeZone: resolved.timezoneName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(dateMs));
    return { timeText: formatted, timezoneText: resolved.timezoneName };
  }
  const offsetHours = Number(resolved.timezoneName.replace("UTC", ""));
  const local = new Date(dateMs + offsetHours * 3600 * 1000);
  const timeText = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")} ${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}:${String(local.getUTCSeconds()).padStart(2, "0")}`;
  return { timeText, timezoneText: resolved.timezoneName };
}

export function getWorldCountryProfile(name: string): WorldCountryProfile {
  const canonical = getWorldCountryCanonicalName(name);
  if (WORLD_COUNTRY_INFO[canonical]) {
    return WORLD_COUNTRY_INFO[canonical];
  }
  if (WORLD_COUNTRY_INFO[name]) {
    return WORLD_COUNTRY_INFO[name];
  }
  const normalized = normalizeWorldName(canonical);
  const population = WORLD_POPULATION_BY_NORMALIZED_NAME[normalized];
  const area = WORLD_AREA_BY_NORMALIZED_NAME[normalized];
  const capital = WORLD_CAPITAL_BY_NORMALIZED_NAME[normalized];
  const populationRank = WORLD_POPULATION_RANK_MAP[normalized];
  const countryId = getWorldCountryIdByName(canonical);
  const timezone = countryId === "CN" ? "Asia/Shanghai" : "UTC";
  return {
    capital: capital || "待补充",
    area: typeof area === "number" ? formatAreaZh(area) : "待补充",
    population:
      typeof population === "number" ? formatPopulationZh(population) : "待补充",
    gdp: "待补充",
    populationRank: populationRank ? String(populationRank) : "待补充",
    gdpRank: "待补充",
    timezone
  };
}

export async function loadChinaGeoJsonRemote() {
  const candidates = [CHINA_GEOJSON_URL, ...CHINA_GEOJSON_FALLBACK_URLS];
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
    }
  }
  throw new Error("Failed to load china geojson");
}

export async function loadWorldGeoJsonRemote() {
  const candidates = [WORLD_GEOJSON_URL, ...WORLD_GEOJSON_FALLBACK_URLS];
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
    }
  }
  throw new Error("Failed to load world geojson");
}

export function buildMapGeoJson(sourceGeoJson?: any) {
  const cloned = JSON.parse(JSON.stringify(sourceGeoJson || chinaGeoJson));
  const cpOverrides: Record<string, [number, number]> = {
    河北: [114.72, 37.9],
    香港: [114.18, 22.15],
    澳门: [113.53, 22.02]
  };
  cloned.features?.forEach((feature: any) => {
    const regionName = String(feature?.properties?.name || "");
    if (cpOverrides[regionName]) {
      feature.properties.cp = cpOverrides[regionName];
    }
  });
  return cloned;
}

export function buildWorldGeoJson(sourceGeoJson?: any) {
  const cloned = JSON.parse(JSON.stringify(sourceGeoJson || worldGeoJson));
  const cpOverrides: Record<string, [number, number]> = {
    France: [1.5, 46.8],
    "United Kingdom": [-2.1, 53.3],
    Spain: [-4.5, 40.2],
    Norway: [10.5, 62]
  };
  cloned.features?.forEach((feature: any) => {
    const regionName = String(feature?.properties?.name || "");
    if (cpOverrides[regionName]) {
      feature.properties.cp = cpOverrides[regionName];
    }
  });
  return cloned;
}
