export const MAPPING_URL = "DOE_mapping.csv";
export const CONTENT_BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQF2Q15XIlAd2ay-Th55lQBPXP34rrFwtJvdKu7PO8hb83nAGIDYD4aZePUZY2-nlRBADoox4cGXvZU/pub?output=tsv&gid=";

export const CONTENT_SHEETS = [
    { name: "K-2", gid: "0" },
    { name: "3-5", gid: "864976039" },
    { name: "6-8", gid: "197140868" },
    { name: "Geometry + Prob", gid: "1250208924" },
    { name: "Algebra 1 + Data", gid: "1611415057" },
    { name: "Algebra 2", gid: "925044476" },
    { name: "Quant Reasoning", gid: "190960375" }
];

export const IMG_PREFIX = "https://storage.googleapis.com/hidoe-math-standards/";

export const colors = { 
    "K": "#f43f5e", "1": "#8b5cf6", "2": "#0ea5e9",
    "3": "#10b981", "4": "#f59e0b", "5": "#6366f1",
    "6": "#475569", "7": "#1e293b", "8": "#0f172a",
    "HS": "#ec4899"
};

export const gradeOrder = {
    "K": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "HS": 9
};

export const domainMap = {
    'CC': 'Counting and Cardinality',
    'OA': 'Operations and Algebraic Thinking',
    'NBT': 'Numbers and Operations in Base Ten',
    'MD': 'Measurement and Data',
    'G': 'Geometry',
    'NF': 'Number and Operations—Fractions',
    'RP': 'Ratios and Proportional Relationships',
    'NS': 'The Number System',
    'EE': 'Expressions and Equations',
    'EEI': 'Expressions and Equations',
    'SP': 'Statistics and Probability',
    'F': 'Functions'
};

export const DEFAULT_WIDTH = 280;
export const DEFAULT_HEIGHT = 100;
