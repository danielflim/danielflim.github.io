/**
 * config.js - Global state and configuration constants
 */

// Data State Variables
var allDatasets = [];
var filteredDatasets = [];
var viewMode = 'grid'; // 'grid' or 'list'
var currentModalDatasetIndex = null;
var csvCache = new Map();

// Spreadsheet details
const SPREADSHEET_ID = '1DaSMvHA3u4A67an5pI6MN6xBhbtLr61tdlvUXZOhLd0';
const SHEET_NAME = 'Metadata';

// Primary Google Sheet export endpoint (returns CSV format)
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// Baseline row counts for catalog datasets
const KNOWN_DATASET_ROW_COUNTS = {
    'car - miles per gallon': 398,
    'space objects': 1274,
    'heights and weights': 25000,
    'child mortality': 17066,
    'household income - us': 32526,
    'sea level - honolulu': 515,
    'co₂ emissions': 26509,
    'co2 emissions': 26509,
    'consumer price index - us': 954,
    'coral cover': 55125,
    'electricity access': 7140,
    'fuel price - us': 573,
    'hours spent with - us': 198,
    'internet usage': 6476,
    'life expectancy': 21565,
    'literacy rate': 2167,
    'minimum wage - hawaii': 59,
    'technology adoption - us': 299,
    'unemployment rate - us': 942,
    'pokemon': 801,
    'lancetfish and mercury': 140,
    'nfl combine': 4947,
    'elementary math assessment scores 2023': 898,
    'high school science lab experiments': 150,
    'early reading & phonics tracking': 35
};

// Backup fallback datasets in case Google Sheets API has CORS or internet connection restrictions
const SAMPLE_FALLBACK_DATA = [
    {
        "Name": "Elementary Math Assessment Scores 2023",
        "Grade": "Grade 3, Grade 4, Grade 5",
        "Subject": "Mathematics, Assessment",
        "Standard": "CCSS.MATH.CONTENT.3.OA.A.1, CCSS.MATH.CONTENT.4.NBT.B.4, CCSS.MATH.CONTENT.5.NBT.A.1",
        "RowCount": 898,
        "Type": "Distribution",
        "Description": "Comprehensive standardized math assessment results from spring 2023 for elementary students across district schools.",
        "Questions": "What is the average proficiency rate across grades? | Are there significant disparities in multiplication accuracy between Grade 3 and Grade 4? | Which domains require curriculum revision?",
        "Dictionary": "entity**{United States}: Target geographic area | student_id: Unique anonymized student identification code | grade_level: Academic grade level (3-5) | math_score*: Raw score on 100-point scale | proficiency_level*: Categorical evaluation (Below, Basic, Proficient, Advanced) | testing_date: Date assessment was completed",
        "URL": "https://raw.githubusercontent.com/daniel-lim-ocid/datasets/main/galton_parent_child_heights.csv"
    },
    {
        "Name": "High School Science Lab Experiments",
        "Grade": "Grade 9, Grade 10, Grade 11, Grade 12",
        "Subject": "Biology, Chemistry, Physics",
        "Standard": "NGSS.HS-LS1-1, NGSS.HS-PS1-2",
        "RowCount": 150,
        "Type": "Model",
        "Description": "A dataset detailing student laboratory experiment completion times, safety compliance ratings, and lab report scores.",
        "Questions": "How does lab duration correlate with lab report scores? | Which safety protocols are most frequently flagged during experiments?",
        "Dictionary": "lab_id: Unique lab session ID | topic: Scientific area | student_count: Number of participating students | average_score*: Class average score on lab report | compliance_pass: Binary flag for safety audit",
        "URL": "https://raw.githubusercontent.com/daniel-lim-ocid/datasets/main/nba_players.csv"
    },
    {
        "Name": "Early Reading & Phonics Tracking",
        "Grade": "Kindergarten, Grade 1, Grade 2",
        "Subject": "English Language Arts, Reading",
        "Standard": "CCSS.ELA-LITERACY.RF.K.1, CCSS.ELA-LITERACY.RF.1.2",
        "RowCount": 35,
        "Type": "Distribution",
        "Description": "Fluency and phonemic awareness tracking data recorded weekly for early childhood education students.",
        "Questions": "What percentage of Grade 1 students reach target words-per-minute by week 12? | Is phonics intervention effective across all early grades?",
        "Dictionary": "student_id: Anonymized student code | week_num: Instructional week number | wpm*: Words read correctly per minute | phonics_accuracy*: Accuracy percentage on phonics diagnostic",
        "URL": "https://raw.githubusercontent.com/daniel-lim-ocid/datasets/main/galton_parent_child_heights.csv"
    }
];
