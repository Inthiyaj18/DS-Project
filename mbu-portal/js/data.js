/* =====================================================================
   data.js  -  All laboratory content lives in this file.
   To add a new experiment, copy one block inside `experimentConfigs`
   and change the text. Sub-experiments (A-G) are built automatically.
   ===================================================================== */

/* ---- Student profile shown on the dashboard (edit these values) ---- */
const profile = {
  name: "S Inthiyaj Ahammad",
  photo: "pro.png",
  roll: "24102A030114",
  branch: "Data Science",
  faculty: "S Bosu Babu",
  degree: "B.Tech",
  subjectCode: "DSXXXX"
};

/* ---- Link helpers: replace GH with your own repository URL ---- */
const YT = (query) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
const GH = "https://github.com/"; // TODO: replace with your repository URL
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

/* ---- Social / contact links shown on profile.html (edit these) ----
   Remove a line (or leave it empty "") to hide that button.        */
const socialLinks = {
  linkedin: "https://www.linkedin.com/in/",   // TODO: your LinkedIn profile URL
  github: GH,                                 // TODO: your GitHub profile URL
  instagram: "https://www.instagram.com/",    // TODO: your Instagram URL
  twitter: "https://x.com/",                  // TODO: your X (Twitter) URL
  youtube: "https://www.youtube.com/",        // TODO: your YouTube channel URL
  email: "mailto:student@mohankbu.ac.in"      // TODO: your e-mail address
};

/* ---- "Suggestions to learn" tiles on the dashboard (edit freely) ----
   Each tile links out to a platform for learning this subject.
   Remove a line to hide a tile.                                        */
const learningSuggestions = [
  { platform: "Kaggle Learn", icon: "⚔", note: "Free hands-on micro-courses: Python, Pandas, Data Visualization, Machine Learning", url: "https://www.kaggle.com/learn" },
  { platform: "NPTEL / SWAYAM", icon: "🎓", note: "University-level Data Science courses you can audit free of cost", url: "https://swayam.gov.in/explorer" },
  { platform: "Coursera", icon: "📖", note: "Python for Everybody and Andrew Ng's Machine Learning specialisations", url: "https://www.coursera.org/specializations/python" },
  { platform: "StatQuest", icon: "📊", note: "Statistics and machine learning made intuitive, on YouTube", url: "https://www.youtube.com/@statquest" },
  { platform: "Krish Naik", icon: "🎤", note: "Data science and ML tutorials explained in practice", url: "https://www.youtube.com/@krishnaik06" },
  { platform: "freeCodeCamp", icon: "✳", note: "Full-length free Python and data science courses", url: "https://www.freecodecamp.org/learn" },
  { platform: "fast.ai", icon: "🚀", note: "Practical, code-first deep learning courses", url: "https://www.fast.ai/" },
  { platform: "W3Schools", icon: "🐍", note: "Quick Python and pandas syntax reference", url: "https://www.w3schools.com/python/" },
  { platform: "Towards Data Science", icon: "✍", note: "Daily articles on real-world data science", url: "https://towardsdatascience.com/" }
];

/*=====================================================================/
   SUBJECTS  (subjects.html)

   A subject groups its own modules, learning materials, experiments
   and sub-experiments.  The built-in Data Science laboratory content
   below belongs to the first subject; new subjects are created in
   Edit Mode.  The id is a unique, persistent string (never the name)
   so renaming a subject never breaks its links.

   Fields:
     id           unique persistent id (string, never reused)
     name         subject name shown in the UI
     description  optional one-line description
     createdAt    ISO date string (set when the subject is added)
     updatedAt    ISO date string (set on every edit)
   ===================================================================== */
const SUBJECT_DEFAULT_ID = "data-science";
const subjectConfigs = [
  {
    id: SUBJECT_DEFAULT_ID,
    name: "Data Science",
    description:
      "Python, NumPy, Pandas, visualisation, statistics and machine learning - the core Data Science Laboratory syllabus.",
    createdAt: "",
    updatedAt: ""
  }
];

/* ---- Builds one sub-experiment object from a compact array ---- */
function buildSub(cfg, s, i) {
  const letter = LETTERS[i];
  const num = Number(cfg.id);
  const [name, aim, concept, steps, code, result, insight] = s;
  const aimRest = aim.replace(/^To /, "");
  return {
    id: num + letter,
    letter: letter,
    name: name,
    youtube: YT(name + " " + cfg.topic + " tutorial"),
    github: GH,
    aim: aim,
    problemStatement:
      'Every data science workflow depends on getting "' + name + '" right. Without it, later steps such as ' +
      "modelling and reporting rest on unreliable inputs. This sub-experiment practises the technique on the " +
      cfg.dataset.name + " so the student can apply it confidently to new data.",
    tools: cfg.tools,
    explanation: concept,
    procedure: steps.split("|"),
    code: code,
    input:
      cfg.dataset.name + " (" + cfg.dataset.records + "). Make sure the data file or library dataset is " +
      "available in your working folder or Python environment before running the code.",
    result: result,
    analysis: insight,
    conclusion:
      "In " + num + letter + ", the student learned how to " + aimRest.charAt(0).toLowerCase() + aimRest.slice(1) +
      " The same approach can now be reused on any similar dataset, and the output can be checked against the expected result shown above.",
    files: Array.isArray(s[7]) ? s[7] : []
  };
}

/* ---- Builds one full experiment object from its config ---- */
function buildExperiment(cfg) {
  return {
    id: cfg.id,
    subjectId: cfg.subjectId || SUBJECT_DEFAULT_ID,
    name: cfg.name,
    topic: cfg.topic,
    tools: cfg.tools,
    description: cfg.description,
    youtube: YT(cfg.name + " tutorial"),
    github: GH,
    overview: cfg.overview,
    aim: cfg.aim,
    problemStatement: cfg.problem,
    dataset: cfg.dataset,
    methodology: cfg.methodology,
    analysis: cfg.analysis,
    results: cfg.results,
    architecture: cfg.architecture,
    subExperiments: cfg.subs.map((s, i) => buildSub(cfg, s, i)),
    files: Array.isArray(cfg.files) ? cfg.files : []
  };
}

const experimentConfigs = [
  /* ------------------------------------------------------------ 01 */
  {
    id: "01",
    name: "Python and NumPy for Data Science",
    topic: "Python NumPy",
    tools: ["Python 3", "NumPy", "Jupyter Notebook"],
    description:
      "This experiment introduces the core programming toolkit used throughout data science: Python and the NumPy library. The purpose is to help students move from plain Python scripts to fast, array-based computation. The problem being solved is that ordinary Python lists become slow and clumsy when thousands of numbers must be processed. Using small marks, price and dice-roll datasets, students create arrays, slice them, apply broadcasting, compute statistics and solve linear equations. Important concepts include data types, vectorization, indexing, axes, shapes and pseudo-random number generation. By the end, learners can explain why NumPy is faster than loops and can write clean numerical code. These skills are the foundation of every later experiment and are used in practice for image processing, scientific simulation, finance and machine learning pipelines.",
    overview:
      "Python and NumPy form the numerical foundation of the data science stack. This experiment walks through core Python constructs and then introduces NumPy's n-dimensional array, which stores numbers compactly and allows whole-array operations without explicit loops. Students learn how arrays are created, indexed, combined and summarised, and how these operations differ from ordinary Python lists.",
    aim: "To understand Python programming basics and use NumPy arrays for fast numerical computation, indexing, broadcasting, statistics, linear algebra and random simulation.",
    problem:
      "Analysts frequently need to process thousands or millions of numbers, such as marks, prices or sensor readings. Plain Python loops are slow and verbose for this work. The problem is to represent numeric data efficiently and perform calculations on it in a readable, vectorised way.",
    dataset: {
      name: "Student marks, product prices and simulated dice rolls",
      source: "Small sample lists created inside the code (no download required)",
      records: "5 to 1,000 values per exercise",
      features: "Marks, price, tax rate, die face",
      types: "Integer and floating-point numbers"
    },
    methodology: [
      "Install Python 3 and NumPy, then open a Jupyter Notebook.",
      "Practise variables, lists, loops and functions in plain Python.",
      "Create NumPy arrays and inspect their shape and data type.",
      "Select elements using indexing, slicing and boolean masks.",
      "Apply broadcasting and vectorised operations instead of loops.",
      "Compute statistics, solve linear equations and simulate random events."
    ],
    analysis:
      "The experiment compares array-based computation with loop-based computation and examines how statistics such as mean, median and standard deviation summarise a set of numbers. It also checks how random samples behave as the sample size grows.",
    results:
      "Students obtain correct array outputs, a verified statistical summary, the solution of a two-variable linear system and a dice simulation whose average is close to the theoretical value of 3.5.",
    architecture: ["Python Scripts", "NumPy Arrays", "Indexing and Slicing", "Vectorised Operations", "Statistics and Linear Algebra", "Results"],
    /* Supporting files shown in the "Experiment Files" panel.
       Drop the file into assets/files/ and add one entry like this: */
    files: [
      { name: "Experiment 01 - NumPy Study Notes.pdf", type: "pdf", url: "assets/files/experiment-01-numpy-notes.pdf", size: "2.7 KB", date: "2026-10-07" },
      { name: "Experiment 01 - Quick Reference.txt", type: "txt", url: "assets/files/experiment-01-quick-reference.txt", size: "1.7 KB", date: "2026-10-07" },
    
      /* Imported from Desktop notebooks - materials */
      { name: "1-a-case-3 (1).ipynb", type: "ipynb", url: "assets/files/imported/1-a-case-3 (1).ipynb", size: "2.6 KB", date: "2026-10-08" },
      { name: "1-Case-1 (1).ipynb", type: "ipynb", url: "assets/files/imported/1-Case-1 (1).ipynb", size: "3.2 KB", date: "2026-10-08" },
    ],
    subs: [
      [
        "Python Basics: Variables, Loops and Functions",
        "To practise the core Python constructs needed for data science programs.",
        "Python stores data in variables and groups values in lists and dictionaries. A for loop repeats work for every item, and a function packages a calculation so it can be reused. Small, well-named functions keep data science code readable and easy to test.",
        "Create a list of marks|Define an average function|Loop over the list with enumerate|Print each student's mark|Print the rounded average",
        `marks = [78, 85, 92, 66, 88]

def average(values):
    return sum(values) / len(values)

for i, m in enumerate(marks, start=1):
    print(f"Student {i}: {m}")

print("Average:", round(average(marks), 2))`,
        `Student 1: 78
Student 2: 85
Student 3: 92
Student 4: 66
Student 5: 88
Average: 81.8`,
        "The average of 81.8 equals the total of 409 divided by 5 students, confirming that the function works. Reusing average() on any other list needs no extra code."
      ],
      [
        "Creating NumPy Arrays",
        "To create NumPy arrays and inspect their shape, size and data type.",
        "A NumPy array stores items of one data type in a compact block of memory. Functions such as array, arange and zeros build arrays quickly, and attributes such as shape and dtype describe them. Arithmetic between arrays works element by element.",
        "Import NumPy as np|Create an array from a list|Create a range with arange|Print shape and dtype|Add two arrays|Create a zero matrix",
        `import numpy as np

a = np.array([10, 20, 30, 40])
b = np.arange(1, 5)

print(a.shape, a.dtype)
print(a + b)
print(np.zeros((2, 3)))`,
        `(4,) int64
[11 22 33 44]
[[0. 0. 0.]
 [0. 0. 0.]]`,
        "Adding two arrays needs no loop because NumPy applies the operation to every pair of elements. The data type may show int32 on some systems."
      ],
      [
        "Indexing and Slicing",
        "To select rows, columns and filtered elements from a NumPy array.",
        "Array elements are reached with row and column positions that start at zero. A slice such as 0:2 selects a range, and a boolean mask such as arr > 8 selects only the values that satisfy a condition. These tools let you extract exactly the data you need.",
        "Create a 3 by 4 array|Read a single element|Select a full column|Slice a sub-matrix|Filter values greater than 8",
        `import numpy as np

arr = np.arange(1, 13).reshape(3, 4)

print(arr[1, 2])
print(arr[:, 1])
print(arr[0:2, 1:3])
print(arr[arr > 8])`,
        `7
[ 2  6 10]
[[2 3]
 [6 7]]
[ 9 10 11 12]`,
        "Row 1, column 2 holds the value 7. The boolean mask returns a flat array of only the values above 8."
      ],
      [
        "Broadcasting and Vectorization",
        "To replace slow loops with vectorised operations and broadcasting.",
        "Vectorization applies one operation to a whole array at once, which is faster and shorter than a loop. Broadcasting lets arrays of different shapes work together, for example adding a single row to every row of a matrix.",
        "Create a price array|Apply an 18 percent tax to all prices|Create a 3 by 3 matrix of ones|Add a row vector using broadcasting|Print both results",
        `import numpy as np

prices = np.array([100, 250, 400])
total = prices * (1 + 0.18)
print(total)

matrix = np.ones((3, 3)) + np.array([1, 2, 3])
print(matrix)`,
        `[118. 295. 472.]
[[2. 3. 4.]
 [2. 3. 4.]
 [2. 3. 4.]]`,
        "One line of code taxed every price. The row [1, 2, 3] was stretched across all three matrix rows without copying data."
      ],
      [
        "Statistical Functions",
        "To summarise numeric data with mean, median, variance and standard deviation.",
        "Descriptive statistics condense many numbers into a few meaningful values. The mean shows the centre, the median shows the middle value, and the standard deviation shows how widely the values spread around the mean.",
        "Create a data array|Compute mean and median|Compute variance and standard deviation|Find minimum and maximum|Interpret the spread",
        `import numpy as np

data = np.array([12, 15, 14, 10, 18, 20, 16])

print("Mean:", data.mean())
print("Median:", np.median(data))
print("Variance:", data.var())
print("Std Dev:", round(data.std(), 2))
print("Min/Max:", data.min(), data.max())`,
        `Mean: 15.0
Median: 15.0
Variance: 10.0
Std Dev: 3.16
Min/Max: 10 20`,
        "Mean and median are equal, so the values are balanced around 15. A standard deviation of 3.16 means a typical value lies about three units from the mean."
      ],
      [
        "Linear Algebra with NumPy",
        "To perform matrix multiplication, determinant and equation solving using NumPy.",
        "Many data science methods are built on matrices. NumPy provides the @ operator for matrix multiplication and the linalg module for determinants, inverses and solving linear systems such as Ax = b.",
        "Define matrix A and vector b|Multiply A by itself|Compute the determinant|Solve the system Ax = b|Verify the solution",
        `import numpy as np

A = np.array([[2, 1], [1, 3]])
b = np.array([5, 10])

print(A @ A)
print("Determinant:", round(np.linalg.det(A), 2))
x = np.linalg.solve(A, b)
print("Solution:", x)
print("Check:", A @ x)`,
        `[[ 5  5]
 [ 5 10]]
Determinant: 5.0
Solution: [1. 3.]
Check: [ 5. 10.]`,
        "The solution x = 1 and y = 3 satisfies both equations, and multiplying A by the solution returns b. A non-zero determinant confirms a unique solution exists."
      ],
      [
        "Random Numbers and Simulation",
        "To generate random data and simulate a simple experiment using NumPy.",
        "Pseudo-random generators create numbers that look random but are repeatable when a seed is fixed. Simulating many dice rolls shows the law of large numbers: as the number of trials grows, the average approaches the theoretical value.",
        "Set a random seed|Simulate 1000 dice rolls|Count how often each face appears|Compute the average roll|Compare with the expected value 3.5",
        `import numpy as np

np.random.seed(42)
rolls = np.random.randint(1, 7, size=1000)

print("Counts:", np.bincount(rolls)[1:])
print("Average roll:", round(rolls.mean(), 2))`,
        `Counts: [ ... six numbers close to 167 each ... ]
Average roll: about 3.5
(Exact numbers depend on the seed and NumPy version.)`,
        "Each face appears roughly one sixth of the time and the average is close to 3.5, matching theory. Increasing the size to 100000 brings the result even closer."
      ],
    
      /* Imported from Desktop notebooks - sub-experiments 01 */
      [
        "Imported Notebook 01 Imported: Student marks CSV loading",
        "To run, inspect and understand the imported notebook '1-a-case-3 (1).ipynb' for experiment 01.",
        "This sub-experiment was imported from the notebook file 1-a-case-3 (1).ipynb. Review the code, run it in the Online Code Lab and record the observations.",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import pandas as pd\n\ndf=pd.read_csv(r\"C:\\Users\\DELL\\Downloads\\student_marks.csv\")\n\nprint(df)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 01 Imported: Diabetes CSV inspection",
        "To run, inspect and understand the imported notebook '1-Case-1 (1).ipynb' for experiment 01.",
        "This sub-experiment was imported from the notebook file 1-Case-1 (1).ipynb. Review the code, run it in the Online Code Lab and record the observations.",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import pandas as pd\n\nurl = r\"C:\\Users\\DELL\\java folder\\diabetes.csv\"\n\ndf=pd.read_csv(url)\nprint(df.head())\n\nprint(df.info())\nprint(df.shape)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
    ]
  },

  /* ------------------------------------------------------------ 02 */
  {
    id: "02",
    name: "Pandas and Data Manipulation",
    topic: "Pandas",
    tools: ["Python 3", "Pandas", "Jupyter Notebook"],
    description:
      "This experiment teaches Pandas, the main library for handling tabular data in Python. Its purpose is to let students load, inspect, select and reshape real datasets with only a few lines of code. The problem being solved is that raw CSV files from colleges, hospitals or businesses are hard to explore using plain loops or spreadsheets once they grow large. Students work with a student-records dataset of 500 rows covering department, semester and marks. They practise Series and DataFrame creation, loc and iloc selection, boolean filtering, sorting, group-by aggregation, merging tables and building pivot tables. Key concepts are labelled indexing, split-apply-combine and relational joins. Learners finish able to answer business questions such as which department scores highest. The same operations power reporting dashboards, data warehouses and every machine learning data pipeline.",
    overview:
      "Pandas provides the DataFrame, a table of labelled rows and columns that behaves like a spreadsheet inside Python. This experiment shows how to create DataFrames, read files, pick out the required data and summarise it by groups. Together these operations make up the day-to-day toolkit of a data analyst.",
    aim: "To load, select, filter, sort, group, merge and pivot tabular data using the Pandas library.",
    problem:
      "A college keeps student marks in large CSV files and wants quick answers, such as the average mark of each department or the list of toppers. Doing this by hand or with loops is slow and error-prone. The problem is to manipulate tabular data accurately with concise code.",
    dataset: {
      name: "Student Records Dataset (students.csv)",
      source: "Sample file prepared by the faculty for the laboratory (replace with your own CSV)",
      records: "500 rows",
      features: "StudentID, Name, Department, DeptID, Semester, Marks",
      types: "Integer IDs, text names and departments, integer marks"
    },
    methodology: [
      "Create Series and DataFrame objects from Python data.",
      "Read the CSV file and inspect its first rows, shape and info.",
      "Select data by label with loc and by position with iloc.",
      "Filter rows with conditions and sort the result.",
      "Group rows and compute aggregate statistics.",
      "Merge two tables and build a pivot table for reporting."
    ],
    analysis:
      "The experiment analyses student performance by department and semester. Aggregations reveal which groups score highest, filters isolate high performers, and the pivot table gives a compact comparison across two dimensions.",
    results:
      "Students produce a clean DataFrame, a ranked list of toppers, a department-wise summary table, a merged dataset with department names and a department-by-semester pivot table.",
    architecture: ["CSV File", "DataFrame", "Selection and Filtering", "Grouping and Aggregation", "Merge and Pivot", "Report Table"],
        files: [
      /* Imported from Desktop notebooks - materials */
      { name: "2nd-exp-ds (1).ipynb", type: "ipynb", url: "assets/files/imported/2nd-exp-ds (1).ipynb", size: "3.1 KB", date: "2026-10-08" }
    ],
subs: [
      [
        "Series and DataFrame Basics",
        "To create Series and DataFrame objects and read basic statistics from them.",
        "A Series is a single labelled column, and a DataFrame is a table made of several Series that share the same row index. DataFrames can be created from dictionaries, and each column can be summarised with methods such as mean.",
        "Import pandas as pd|Create a dictionary of columns|Convert it into a DataFrame|Print the table|Compute the mean of a column",
        `import pandas as pd

df = pd.DataFrame({
    "Name": ["Asha", "Ravi", "Meena"],
    "Marks": [88, 76, 92]
})

print(df)
print("Mean marks:", round(df["Marks"].mean(), 2))`,
        `    Name  Marks
0   Asha     88
1   Ravi     76
2  Meena     92
Mean marks: 85.33`,
        "The row index 0, 1, 2 is created automatically. The mean of 88, 76 and 92 is 256 divided by 3, which is 85.33."
      ],
      [
        "Loading and Inspecting a CSV File",
        "To read a CSV file into a DataFrame and inspect its structure.",
        "The read_csv function turns a file into a DataFrame. Inspecting the data first with head, shape, info and describe shows how many rows exist, which columns are present and what data types they hold.",
        "Import pandas|Read students.csv|Display the first five rows|Print the shape|Check column types with info|Review statistics with describe",
        `import pandas as pd

df = pd.read_csv("students.csv")

print(df.head())
print("Shape:", df.shape)
df.info()
print(df.describe())`,
        `First five rows of the table are displayed
Shape: (500, 6)
Column list with data types and non-null counts
Summary statistics of numeric columns`,
        "The shape confirms 500 records and 6 columns. The info output shows whether any column has missing values before analysis begins."
      ],
      [
        "Selecting Data with loc and iloc",
        "To select rows and columns by label and by position.",
        "The loc indexer selects by row and column labels, while iloc selects by integer position. Choosing the right one avoids mistakes, especially after sorting or filtering changes the row order.",
        "Load the dataset|Select rows 0 to 2 and two columns with loc|Select the same block with iloc|Select one full column|Compare the outputs",
        `import pandas as pd

df = pd.read_csv("students.csv")

print(df.loc[0:2, ["Name", "Marks"]])
print(df.iloc[0:3, 0:2])
print(df["Marks"].head())`,
        `Three rows with the Name and Marks columns
Three rows with the first two columns
The first five values of the Marks column`,
        "loc includes the end label 2, while iloc excludes the end position 3, so both return three rows. Knowing this difference prevents off-by-one errors."
      ],
      [
        "Filtering and Sorting Rows",
        "To filter rows by condition and sort the result.",
        "A condition such as df['Marks'] >= 80 creates a True or False value for every row, and using it as an index keeps only the True rows. Conditions can be combined with & and |, and sort_values orders the result.",
        "Load the dataset|Create a condition for marks of 80 or more|Apply it to the DataFrame|Sort by marks in descending order|Display the top ten rows",
        `import pandas as pd

df = pd.read_csv("students.csv")

high = df[df["Marks"] >= 80]
top = high.sort_values("Marks", ascending=False)

print(len(high), "students scored 80 or more")
print(top.head(10))`,
        `N students scored 80 or more
Ten rows sorted from highest to lowest marks`,
        "The filtered table contains only high scorers, and sorting places the toppers first. Wrap each condition in brackets when combining several."
      ],
      [
        "GroupBy and Aggregation",
        "To summarise data by category using groupby and aggregation functions.",
        "GroupBy follows the split-apply-combine idea: split rows into groups, apply a calculation such as mean to each group, and combine the answers into a new table. It answers questions such as the average mark per department.",
        "Load the dataset|Group rows by Department|Select the Marks column|Apply mean, max and count|Sort the summary by mean",
        `import pandas as pd

df = pd.read_csv("students.csv")

summary = df.groupby("Department")["Marks"].agg(["mean", "max", "count"])
print(summary.sort_values("mean", ascending=False).round(2))`,
        `One row per department with columns mean, max and count,
sorted so the best-performing department is first`,
        "The summary lets us compare departments at a glance. The count column also shows whether any group is too small to trust."
      ],
      [
        "Merging and Joining Tables",
        "To combine two related tables using a common key column.",
        "Real data is often spread across several tables. The merge function joins them on a shared key, similar to a SQL join. A left join keeps every row of the first table and adds matching information from the second.",
        "Load students and departments tables|Check the common DeptID column|Merge using a left join|Inspect the merged shape|Check for unmatched rows",
        `import pandas as pd

students = pd.read_csv("students.csv")
depts = pd.DataFrame({
    "DeptID": [1, 2, 3],
    "DeptName": ["Data Science", "Computer Science", "Electronics"]
})

merged = pd.merge(students, depts, on="DeptID", how="left")
print(merged.head())
print("Shape:", merged.shape)`,
        `Student rows with an extra DeptName column
Shape: (500, 7)`,
        "The merged table keeps all 500 students and adds one new column. Missing DeptName values would signal IDs that have no match in the departments table."
      ],
      [
        "Pivot Tables",
        "To reshape data into a two-dimensional summary using a pivot table.",
        "A pivot table spreads one categorical column across rows and another across columns, filling the cells with an aggregate such as the mean. It is a compact way to compare two dimensions together.",
        "Load the dataset|Choose Department as rows|Choose Semester as columns|Aggregate Marks with the mean|Round and display the table",
        `import pandas as pd

df = pd.read_csv("students.csv")

pivot = pd.pivot_table(
    df, values="Marks", index="Department",
    columns="Semester", aggfunc="mean"
)
print(pivot.round(1))`,
        `A table with departments as rows, semesters as columns
and average marks in each cell`,
        "Reading across a row shows how a department changes from semester to semester, and reading down a column compares departments in the same semester."
      ],
    
      /* Imported from Desktop notebooks - sub-experiments 02 */
      [
        "Imported Notebook 02A: 2A",
        "To run, inspect and understand the imported notebook '2nd-exp-ds (1).ipynb' for experiment 02.",
        "# 2A",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import requests\nimport pandas as pd\nimport sqlite3\n\nurl='https://api.github.com/repos/pandas-dev/pandas/issues'\nresponses=requests.get(url)\nissues=responses.json()\ndf_issues=pd.DataFrame(issues)\nprint(df_issues[['id','title','state']].head())",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 02B: 2B (2)",
        "To run, inspect and understand the imported notebook '2nd-exp-ds (1).ipynb' for experiment 02.",
        "# 2B",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "conn=sqlite3.connect(\"Students.db\")\ncursor=conn.cursor()\ncursor.execute(\"CREATE TABLE IF NOT EXISTS Students(id INTEGER,name TEXT)\")\ncursor.execute(\"INSERT INTO Students VALUES(1,'Ahammad')\")\nconn.commit()\ncursor.execute(\"INSERT INTO Students VALUES(2,'Inthiyaj')\")\nconn.commit()\n\nconn.commit()\ndf=pd.read_sql_query(\"SELECT * FROM Students\",conn)\nprint(df)\ncursor.execute(\"DELETE FROM Students  where id=1\")\ncursor.execute(\"UPDATE Students set name ='Virat' WHERE id=1\")\nconn.commit()\nconn.close()",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
    ]
  },

  /* ------------------------------------------------------------ 03 */
  {
    id: "03",
    name: "Data Cleaning and Preprocessing",
    topic: "Data Cleaning Pandas",
    tools: ["Python 3", "Pandas", "NumPy", "Scikit-learn", "Jupyter Notebook"],
    description:
      "This experiment focuses on data cleaning, the step that usually consumes most of a data scientist's time. The purpose is to transform a messy dataset into one that is complete, consistent and ready for modelling. The problem being solved is that real data contains missing values, duplicate rows, wrong data types, extreme outliers and text categories that algorithms cannot read. Students use the Titanic passenger dataset with 891 records and 12 columns, where Age, Cabin and Embarked contain gaps. Methods include inspection with info and describe, imputation, duplicate removal, type conversion, IQR-based outlier detection, one-hot encoding and feature scaling. Key concepts are data quality, imputation strategy and normalisation versus standardisation. Learners gain the habit of validating data before analysis. These techniques are used in banking, healthcare and e-commerce, where poor data quality directly causes wrong decisions.",
    overview:
      "Data cleaning converts raw, untidy data into a reliable table. This experiment follows a realistic cleaning pipeline: inspect the data, repair missing values, remove duplicates, fix data types, treat outliers, encode text categories as numbers and finally scale numeric features.",
    aim: "To detect and correct common data quality problems and prepare a dataset for analysis and machine learning.",
    problem:
      "Models trained on dirty data give unreliable predictions. The Titanic dataset has hundreds of missing ages, a mostly empty Cabin column, text-based categories and extreme fares. The problem is to clean the data systematically without losing valuable information.",
    dataset: {
      name: "Titanic Passenger Dataset",
      source: "Kaggle / Seaborn sample datasets (titanic.csv)",
      records: "891 rows",
      features: "PassengerId, Survived, Pclass, Name, Sex, Age, SibSp, Parch, Ticket, Fare, Cabin, Embarked",
      types: "Integers, floating-point numbers and text categories"
    },
    methodology: [
      "Inspect the data with info, describe and a missing-value count.",
      "Fill or drop missing values using a suitable strategy.",
      "Detect and remove duplicate records.",
      "Convert columns to correct data types.",
      "Detect outliers with the IQR rule and decide how to treat them.",
      "Encode categorical columns and scale numeric columns."
    ],
    analysis:
      "The experiment measures how much data was missing, how many rows were affected by each cleaning step and how the distribution of Age and Fare changes after cleaning and scaling. Each step is validated by re-checking the dataset.",
    results:
      "The final dataset has no missing values in the used columns, no duplicates, correct data types, numeric encodings of categories and scaled numeric features ready for machine learning.",
    architecture: ["Raw Dataset", "Inspection", "Missing Values", "Duplicates and Types", "Outliers", "Encoding and Scaling", "Clean Dataset"],
        files: [
      /* Imported from Desktop notebooks - materials */
      { name: "3rd-exp-ds (1).ipynb", type: "ipynb", url: "assets/files/imported/3rd-exp-ds (1).ipynb", size: "3.3 KB", date: "2026-10-08" }
    ],
subs: [
      [
        "Inspecting the Dataset",
        "To inspect a dataset and identify missing values and data types.",
        "Cleaning starts with understanding the data. The info method lists columns, types and non-null counts, describe summarises numeric columns, and isnull().sum() counts the missing values in every column.",
        "Load titanic.csv|Display the first rows|Run info to see types|Run describe for statistics|Count missing values per column",
        `import pandas as pd

df = pd.read_csv("titanic.csv")

print(df.head())
df.info()
print(df.describe())
print(df.isnull().sum())`,
        `Shape: 891 rows, 12 columns
Missing values: Age 177, Cabin 687, Embarked 2
All other columns: 0`,
        "Cabin is missing in most rows, Age in about a fifth of rows and Embarked in only two rows, so each column needs a different treatment."
      ],
      [
        "Handling Missing Values",
        "To fill or remove missing values using suitable strategies.",
        "Missing numeric values can be filled with the median, which is robust to outliers. Missing categories can be filled with the most frequent value, called the mode. A column that is mostly empty is usually dropped instead.",
        "Fill Age with the median|Fill Embarked with the mode|Drop the Cabin column|Recount missing values|Confirm all gaps are handled",
        `df["Age"] = df["Age"].fillna(df["Age"].median())
df["Embarked"] = df["Embarked"].fillna(df["Embarked"].mode()[0])
df = df.drop(columns=["Cabin"])

print(df.isnull().sum())`,
        `All remaining columns now show 0 missing values.
Shape changes from (891, 12) to (891, 11).`,
        "No rows were lost, because values were imputed instead of deleted. The median was preferred over the mean because a few very old passengers would pull the mean upward."
      ],
      [
        "Removing Duplicate Records",
        "To detect and remove duplicate rows from a dataset.",
        "Duplicate rows overcount some observations and bias statistics. The duplicated method flags repeated rows and drop_duplicates removes them. Always check the count before and after to be sure only true duplicates are removed.",
        "Count duplicated rows|Display any duplicates|Drop duplicates|Compare shape before and after|Reset the index",
        `print("Duplicates:", df.duplicated().sum())

before = df.shape
df = df.drop_duplicates().reset_index(drop=True)

print("Before:", before, "After:", df.shape)`,
        `Duplicates: 0
Before: (891, 11) After: (891, 11)`,
        "This dataset has no duplicate rows, so the shape is unchanged. The same code would remove repeated records from any other dataset."
      ],
      [
        "Fixing Data Types and Formatting",
        "To convert columns to appropriate data types and tidy text values.",
        "Correct data types save memory and enable correct operations. Labels such as Survived and Pclass are categories rather than quantities, and text columns should have consistent spacing and capitalisation.",
        "Check current dtypes|Convert Survived and Pclass to category|Round Fare to two decimals|Strip spaces and title-case Name|Verify with dtypes",
        `df["Survived"] = df["Survived"].astype("category")
df["Pclass"] = df["Pclass"].astype("category")
df["Fare"] = df["Fare"].round(2)
df["Name"] = df["Name"].str.strip().str.title()

print(df.dtypes)`,
        `Survived    category
Pclass      category
Fare         float64
Name          object`,
        "Survived and Pclass are now treated as categories, preventing meaningless averages such as the mean passenger class."
      ],
      [
        "Detecting and Treating Outliers",
        "To detect outliers using the IQR rule and limit their effect.",
        "The interquartile range (IQR) is the distance between the 25th and 75th percentiles. Values below Q1 - 1.5 x IQR or above Q3 + 1.5 x IQR are flagged as outliers. They can be removed or capped depending on whether they are errors or genuine extreme values.",
        "Compute Q1 and Q3 of Fare|Calculate the IQR|Find the lower and upper bounds|Count the outliers|Cap values at the bounds",
        `q1 = df["Fare"].quantile(0.25)
q3 = df["Fare"].quantile(0.75)
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr

outliers = df[(df["Fare"] < low) | (df["Fare"] > high)]
print("Bounds:", round(low, 2), round(high, 2))
print("Outliers:", len(outliers))

df["Fare"] = df["Fare"].clip(low, high)`,
        `Bounds: about -26.72 and 65.63
Outliers: about 116 fares above the upper bound
Fare values are capped at the upper bound.`,
        "A small group of very expensive tickets stretches the Fare distribution. Capping keeps those passengers while reducing their pull on later statistics."
      ],
      [
        "Encoding Categorical Variables",
        "To convert text categories into numeric columns using one-hot encoding.",
        "Most algorithms need numbers. One-hot encoding creates a separate 0 or 1 column for each category. Dropping the first column avoids redundancy, because the remaining columns already carry the same information.",
        "List the categorical columns|Apply get_dummies to Sex and Embarked|Drop the first category of each|Inspect the new columns|Confirm all new columns are numeric",
        `encoded = pd.get_dummies(df, columns=["Sex", "Embarked"], drop_first=True)

print(encoded.columns.tolist())
print(encoded[["Sex_male", "Embarked_Q", "Embarked_S"]].head())`,
        `New columns: Sex_male, Embarked_Q, Embarked_S
Each contains only 0 and 1 (True and False in newer Pandas).`,
        "Sex becomes a single column and Embarked becomes two. A passenger with zero in both Embarked columns boarded at the dropped category, Cherbourg."
      ],
      [
        "Feature Scaling",
        "To scale numeric features using normalisation and standardisation.",
        "Features measured on different scales can dominate distance-based algorithms. Min-max scaling squeezes values into the range 0 to 1, while standardisation rescales them to a mean of 0 and a standard deviation of 1.",
        "Select Age and Fare|Apply MinMaxScaler|Apply StandardScaler|Compare minimum, maximum and mean|Save the cleaned dataset",
        `from sklearn.preprocessing import MinMaxScaler, StandardScaler

cols = ["Age", "Fare"]
minmax = MinMaxScaler().fit_transform(df[cols])
standard = StandardScaler().fit_transform(df[cols])

print("MinMax range:", minmax.min(), minmax.max())
print("Standard mean:", standard.mean().round(2))

df.to_csv("titanic_clean.csv", index=False)`,
        `MinMax range: 0.0 1.0
Standard mean: 0.0
titanic_clean.csv saved`,
        "After min-max scaling every value lies between 0 and 1, and after standardisation the average is zero. Both features now contribute fairly to a model."
      ],
    
      /* Imported from Desktop notebooks - sub-experiments 03 */
      [
        "Imported Notebook 03A: 3A",
        "To run, inspect and understand the imported notebook '3rd-exp-ds (1).ipynb' for experiment 03.",
        "# 3A",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import numpy as np\nimport pandas as pd\n\ndata={'A':[1,2,np.nan],'B':[4,np.nan,np.nan]}\ndf=pd.DataFrame(data)\nprint(df.isna())\ndf_clean=df.dropna()\ndf_filled=df.fillna(0)\nprint(df_clean)\nprint(df_filled)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 03B: 3B (2)",
        "To run, inspect and understand the imported notebook '3rd-exp-ds (1).ipynb' for experiment 03.",
        "# 3B",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "df=pd.DataFrame({'gender':['male','female']})\ndf['gengder_num']=df['gender'].map({'male':1,'female':0})\ndf_renamed=df.rename(columns={'gender':'Gender'})\nprint(df_renamed)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 03C: 3C (3)",
        "To run, inspect and understand the imported notebook '3rd-exp-ds (1).ipynb' for experiment 03.",
        "# 3C",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "data=pd.DataFrame(np.random.randn(100,3))\noutliers=(data>3) | (data <-3)\nprint(outliers.sum())",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 03D: 3D (4)",
        "To run, inspect and understand the imported notebook '3rd-exp-ds (1).ipynb' for experiment 03.",
        "# 3D",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import re\ntxt='This is \\t a \\n test'\nsplit_txt=re.split(r'\\st', txt)\nprint(split_txt)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
    ]
  },

  /* ------------------------------------------------------------ 04 */
  {
    id: "04",
    name: "Exploratory Data Analysis (EDA)",
    topic: "Exploratory Data Analysis",
    tools: ["Python 3", "Pandas", "NumPy", "Seaborn", "Jupyter Notebook"],
    description:
      "This experiment introduces Exploratory Data Analysis, the process of understanding a dataset before building any model. Its purpose is to reveal the structure, patterns, relationships and anomalies hidden in the data. The problem being solved is that jumping straight to modelling without understanding the data leads to misleading conclusions. Students analyse the restaurant tips dataset of 244 bills with total bill, tip, gender, smoker status, day, time and party size. They compute summary statistics, study distributions and skewness, measure correlation, compare categories, perform bivariate analysis and create a derived tip-percentage feature. Key concepts are mean versus median, correlation versus causation, and grouping. Learners finish able to write a short evidence-based summary of a dataset. EDA is used by analysts in retail, finance and product teams before every reporting or modelling project.",
    overview:
      "Exploratory Data Analysis (EDA) is a structured way to question a dataset. Students describe each variable, study how values are distributed, measure relationships between variables and compare groups. The findings guide later decisions about cleaning, feature creation and modelling.",
    aim: "To explore a dataset using summary statistics, distributions, correlations and group comparisons, and to summarise the findings.",
    problem:
      "A restaurant owner wants to know what influences the tips customers leave. Without exploration it is unclear which factors matter. The problem is to find patterns in the data that explain tipping behaviour.",
    dataset: {
      name: "Restaurant Tips Dataset",
      source: "Seaborn built-in dataset: sns.load_dataset('tips')",
      records: "244 rows",
      features: "total_bill, tip, sex, smoker, day, time, size",
      types: "Floating-point numbers, integers and categorical text"
    },
    methodology: [
      "Load the dataset and review its structure.",
      "Compute summary statistics for numeric columns.",
      "Study distributions and skewness.",
      "Measure correlation between numeric variables.",
      "Compare categories using counts and group averages.",
      "Create a derived feature and write the final summary."
    ],
    analysis:
      "The experiment looks for relationships between the bill amount and the tip, differences between days and groups, and the typical tip percentage. Each finding is supported by a number rather than an impression.",
    results:
      "Students find a positive correlation between bill and tip, higher tips on weekends, and an average tip of about 16 percent of the bill, and they record these findings in a short EDA summary.",
    architecture: ["Load Data", "Summary Statistics", "Distributions", "Correlation", "Group Comparison", "Insights"],
        files: [
      /* Imported from Desktop notebooks - materials */
      { name: "DS-ex-4.ipynb", type: "ipynb", url: "assets/files/imported/DS-ex-4.ipynb", size: "9.8 KB", date: "2026-10-08" },
      { name: "matplotlib1.ipynb", type: "ipynb", url: "assets/files/imported/matplotlib1.ipynb", size: "215.2 KB", date: "2026-10-08" }
    ],
subs: [
      [
        "Summary Statistics",
        "To describe numeric and categorical columns using summary statistics.",
        "Summary statistics describe a column with a few numbers: count, mean, standard deviation, minimum, quartiles and maximum. Comparing the mean with the median is a quick check for skew in the data.",
        "Load the tips dataset|Check shape and column names|Run describe on numeric columns|Run describe on categorical columns|Note the mean and median",
        `import seaborn as sns

df = sns.load_dataset("tips")

print(df.shape)
print(df.describe().round(2))
print(df.describe(include="object"))`,
        `Shape: (244, 7)
total_bill: mean about 19.79, median about 17.80
tip: mean about 3.00, median about 2.90`,
        "For total_bill the mean is higher than the median, which suggests a few large bills pull the average upward."
      ],
      [
        "Distribution and Skewness",
        "To study the shape of a variable using skewness and histograms.",
        "A distribution shows how often each value occurs. Skewness measures asymmetry: positive skew means a long tail on the right. A histogram makes the shape visible and helps decide whether a transformation is needed.",
        "Compute skewness of total_bill and tip|Plot a histogram of total_bill|Add a density curve|Interpret the shape|Compare with the tip distribution",
        `import matplotlib.pyplot as plt

print("Skew total_bill:", round(df["total_bill"].skew(), 2))
print("Skew tip:", round(df["tip"].skew(), 2))

sns.histplot(df["total_bill"], kde=True)
plt.title("Distribution of Total Bill")
plt.show()`,
        `Skew total_bill: about 1.13
Skew tip: about 1.47
Histogram with a long right tail`,
        "Both variables are right-skewed, meaning most bills and tips are small while a few are large."
      ],
      [
        "Correlation Analysis",
        "To measure the linear relationship between numeric variables.",
        "The correlation coefficient ranges from -1 to +1. Values near +1 mean the variables rise together, values near zero mean no linear relationship. Correlation does not prove that one variable causes the other.",
        "Select numeric columns|Compute the correlation matrix|Read the value for total_bill and tip|Compare with size|Discuss correlation versus causation",
        `corr = df.corr(numeric_only=True).round(2)

print(corr)
print("Bill vs tip:", corr.loc["total_bill", "tip"])`,
        `Bill vs tip: about 0.68
Bill vs size: about 0.60
Tip vs size: about 0.49`,
        "A correlation of about 0.68 shows that larger bills tend to receive larger tips. It does not mean the bill amount alone causes the tip."
      ],
      [
        "Analysing Categorical Variables",
        "To analyse categories using counts and proportions.",
        "For categorical columns the useful questions are how many rows fall into each category and what share each category holds. The value_counts method answers both, and the result can reveal imbalanced groups.",
        "Count rows per day|Convert counts to percentages|Count rows per time of day|Count smokers and non-smokers|Note any imbalance",
        `print(df["day"].value_counts())
print(df["day"].value_counts(normalize=True).round(2))
print(df["time"].value_counts())
print(df["smoker"].value_counts())`,
        `Sat 87, Sun 76, Thur 62, Fri 19  (total 244)
Dinner 176, Lunch 68
No 151, Yes 93`,
        "Saturday and Sunday contain most of the data, while Friday has only 19 bills, so conclusions about Friday are less reliable."
      ],
      [
        "Bivariate Analysis: Comparing Groups",
        "To compare a numeric variable across categories.",
        "Bivariate analysis studies two variables together. Grouping by a category and averaging a numeric column shows whether the groups differ, and a group-wise table is the first step before drawing a chart.",
        "Group by day|Compute mean tip|Group by smoker status|Group by time of day|Compare the group averages",
        `print(df.groupby("day")["tip"].mean().round(2))
print(df.groupby("smoker")["tip"].mean().round(2))
print(df.groupby("time")["tip"].mean().round(2))`,
        `Fri 2.73, Sat 2.99, Sun 3.26, Thur 2.77
Dinner tips are slightly higher than lunch tips.`,
        "Sunday has the highest average tip. The difference between groups is small, so a statistical test would be needed to confirm it."
      ],
      [
        "Feature Creation: Tip Percentage",
        "To create a new feature that makes comparisons fair.",
        "Raw tip amounts depend on the bill size. Dividing the tip by the bill gives a tip percentage that can be compared across customers. Creating such derived features is a key part of EDA.",
        "Create tip_pct = tip / total_bill x 100|Describe the new column|Group by size of party|Find the largest tip percentage|Interpret the result",
        `df["tip_pct"] = df["tip"] / df["total_bill"] * 100

print(df["tip_pct"].describe().round(2))
print(df.groupby("size")["tip_pct"].mean().round(2))`,
        `Mean tip percentage: about 16.08
Standard deviation: about 6.10`,
        "Customers tip about 16 percent on average. Small parties tend to tip a higher percentage than large parties."
      ],
      [
        "Writing the EDA Summary",
        "To combine the findings into a short evidence-based summary.",
        "An EDA ends with a concise report of what was found. Each statement should cite a number from the analysis so that readers can verify it, and the summary should point out limits such as small groups or skewed data.",
        "Collect key numbers from earlier steps|Store them in a dictionary|Print each as a sentence|Add limitations|Share the summary",
        `summary = {
    "Rows analysed": len(df),
    "Average bill": round(df["total_bill"].mean(), 2),
    "Average tip %": round(df["tip_pct"].mean(), 2),
    "Bill-tip correlation": round(df["total_bill"].corr(df["tip"]), 2),
    "Busiest day": df["day"].value_counts().idxmax(),
}

for key, value in summary.items():
    print(f"{key}: {value}")`,
        `Rows analysed: 244
Average bill: 19.79
Average tip %: 16.08
Bill-tip correlation: 0.68
Busiest day: Sat`,
        "The summary gives a complete picture in five lines. It can be extended with further findings and limitations."
      ],
    
      /* Imported from Desktop notebooks - sub-experiments 04 */
      [
        "Imported Notebook 04A: 4a",
        "To run, inspect and understand the imported notebook 'DS-ex-4.ipynb' for experiment 04.",
        "# 4th Experiment\n# 4a",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import pandas as pd\nindex = [\n    ['Engineering', 'Engineering', 'Science', 'Science'],\n    ['CSE', 'ECE', 'Physics', 'Chemistry']\n]\nmulti_index = pd.MultiIndex.from_arrays(\n    index,\n    names=['Department', 'Branch']\n)\nmarks = pd.Series(\n    [85, 78, 92, 88],\n    index=multi_index\n)\nprint(\"Original Series:\")\nprint(marks)\nprint(\"\\nData for Engineering:\")\nprint(marks.loc['Engineering'])\nprint(\"\\nData for CSE:\")\nprint(marks.loc[('Engineering', 'CSE')])\nprint(\"\\nData for Science:\")\nprint(marks.loc['Science'])",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 04B: 4b (2)",
        "To run, inspect and understand the imported notebook 'DS-ex-4.ipynb' for experiment 04.",
        "# 4b",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import pandas as pd\nindex = pd.MultiIndex.from_tuples(\n    [\n        ('Engineering', 'CSE'),\n        ('Engineering', 'ECE'),\n        ('Science', 'Physics'),\n        ('Science', 'Chemistry')\n    ],\n    names=['Department', 'Branch']\n)\ndata = pd.DataFrame(\n    {\n        '2025': [85, 78, 92, 88],\n        '2026': [90, 82, 95, 91]\n    },\n    index=index\n)\nprint(\"Original Tabular Data:\")\nprint(data)\nunstacked_data = data.unstack()\nprint(\"\\nData after Unstack():\")\nprint(unstacked_data)\nstacked_data = unstacked_data.stack(future_stack=True)\nprint(\"\\nData after Stack():\")\nprint(stacked_data)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 04C: 4c (3)",
        "To run, inspect and understand the imported notebook 'DS-ex-4.ipynb' for experiment 04.",
        "# 4c",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import pandas as pd\ndf1 = pd.DataFrame(\n    {\n        'Name': ['Inthiyaj', 'Chandu', 'Vinod'],\n        'Marks': [85, None, 78],\n        'Grade': ['A', 'B', None]\n    },\n    index=[101, 102, 103]\n)\ndf2 = pd.DataFrame(\n    {\n        'Name': ['Inthiyaj', 'Anu', 'Nikhil'],\n        'Marks': [90, 88, 82],\n        'Grade': [None, 'A', 'B']\n    },\n    index=[101, 102, 104]\n)\nprint(\"First DataFrame:\")\nprint(df1)\nprint(\"\\nSecond DataFrame:\")\nprint(df2)\n\nmerged = pd.merge(\n    df1,\n    df2,\n    left_index=True,\n    right_index=True,\n    how='outer',\n    suffixes=('_DF1', '_DF2')\n)\nprint(\"\\nMerged DataFrame:\")\nprint(merged)\ncombined = df1.combine_first(df2)\nprint(\"\\nDataFrame after combine_first():\")\nprint(combined)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 04A: 4a.1 (4)",
        "To run, inspect and understand the imported notebook 'DS-ex-4.ipynb' for experiment 04.",
        "# 4a.1",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import pandas as pd\nimport numpy as np\ndata = pd.Series(\n    np.random.randn(6),\n    index=[\n        ['a', 'a', 'b', 'b', 'c', 'c'],\n        [1, 2, 1, 2, 1, 2]\n    ]\n)\nprint(data)\nprint(data['b'])\nprint(data[:, 1])",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 04B: 4b.1 (5)",
        "To run, inspect and understand the imported notebook 'DS-ex-4.ipynb' for experiment 04.",
        "# 4b.1",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "df = data.unstack()\nprint(df)\nprint(df.stack())",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 04C: 4c.1 (6)",
        "To run, inspect and understand the imported notebook 'DS-ex-4.ipynb' for experiment 04.",
        "# 4c.1",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "df1 = pd.DataFrame({\n    'a': [1, np.nan, 3],\n    'b': [4, 5, 6]\n})\ndf2 = pd.DataFrame({\n    'a': [7, 8, 9],\n    'b': [np.nan, 11, 12]\n})\nmerged = df1.combine_first(df2)\nprint(merged)",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
      [
        "Imported Notebook 04 Imported: NumPy and Matplotlib practice notebook",
        "To run, inspect and understand the imported notebook 'matplotlib1.ipynb' for experiment 04.",
        "This sub-experiment was imported from the notebook file matplotlib1.ipynb. Review the code, run it in the Online Code Lab and record the observations.",
        "Open the imported notebook material|Read the notebook headings and code|Run the code in the Online Code Lab|Inspect outputs and visualizations|Update dataset paths if needed|Record observations and conclusions",
        "import numpy as np\narr_od=np.array(25)\n\nprint(\"1D Array:\",arr_od)\n\nimport matplotlib.pyplot as plt\n\nx = [1, 2, 3, 4, 5]\ny = [5, 10, 15, 20, 25]\n\nplt.plot(x, y, color='green', linestyle='--', marker='o',ms='10')\nplt.title(\"Line Chart Example\")\nplt.xlabel(\"X values\")\nplt.ylabel(\"Y values\")\nplt.grid(linestyle='--',alpha=0.3,color='r')\nplt.show()\n\nimport matplotlib.pyplot as plt\nimport numpy as np\n\nx = [1,2,3,6]\ny = [6,3,4,5]\n\nplt.plot(x, y)\nplt.show()\n\nimport matplotlib.pyplot as plt\ncategories = ['Apples', 'Bananas', 'Oranges']\nsales = [150, 200, 120]\ncolors = ['green', 'yellow', 'orange']\nplt.bar(categories, sales, color=colors, width=0.6, edgecolor='black', label='Fruit Sales')\nplt.xlabel('Fruit Type')\nplt.ylabel('Units Sold')\nplt.title('Quarterly Fruit Sales')\nplt.legend()\nplt.show()\n\nimport matplotlib.pyplot as plt\nsizes = [15, 30, 45, 10]\nlabels = ['Frogs', 'Hogs', 'Dogs', 'Logs']\nplt.pie(sizes, labels=labels)\nplt.show()\n\nlabels = ['Python', 'Java', 'C++', 'JavaScript']\nsizes = [40, 30, 20, 10]\n\nplt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)\nplt.title(\"Language Market Share\")\nplt.show()\n\nx = [1, 2, 3, 4, 5]\ny1 = [5, 10, 15, 20, 25]\ny2 = [25, 20, 15, 10, 5]\n\nplt.subplot(1, 2, 1)\nplt.plot(x, y1, color='green')\nplt.title(\"Increasing\")\n\nplt.subplot(1, 2, 2)  \nplt.plot(x, y2, color='red')\nplt.title(\"Decreasing\")\n\nplt.show()\n\ny= ['A','B','C','D']\nx= [1,2,3,4]\nplt.barh(y,x, edgecolor='y', color='r')\nplt.show()\n\nimport matplotlib.pyplot as plt\n\nx = [1, 2, 3, 4, 5]\ny = [5, 10, 15, 20, 25]\n\nplt.plot(x, y, color='b', linestyle='-', marker='d',ms='10',mfc='y',mec='grey')\nplt.title(\"Line Chart Inthiyaj\")\nplt.xlabel(\"X values\")\nplt.ylabel(\"Y values\")\nplt.grid(linestyle='--',alpha=0.3,color='r')\nplt.show()",
        "The imported notebook code runs and produces the expected printed output, tables or visualizations.",
        "This imported activity preserves the source notebook code inside the portal so it can be edited, replaced or extended by the user."
      ],
    ]
  },

  /* ------------------------------------------------------------ 05 */
  {
    id: "05",
    name: "Data Visualization with Matplotlib and Seaborn",
    topic: "Data Visualization Matplotlib Seaborn",
    tools: ["Python 3", "Matplotlib", "Seaborn", "Pandas", "Jupyter Notebook"],
    description:
      "This experiment covers data visualization with Matplotlib and Seaborn. The purpose is to teach students how to turn numbers into clear charts that communicate a message. The problem being solved is that tables of raw values hide trends, spreads and outliers that a good chart shows instantly. Using the restaurant tips dataset, students draw line, bar, histogram, scatter, box and heatmap charts and finally combine several plots into one dashboard-style figure. Key concepts include choosing the right chart for the question, labelling axes, colour use, bins, quartiles and correlation matrices. Learners finish able to justify why a particular chart suits a particular dataset. Visualization skills are used daily in business intelligence, scientific publishing, journalism and the presentation of machine learning results to non-technical stakeholders.",
    overview:
      "Visualization turns data into pictures that the human eye can read quickly. This experiment introduces the most common chart types, explains when each one is appropriate and shows how to label and combine charts so that the message is clear.",
    aim: "To create and interpret line, bar, histogram, scatter, box and heatmap charts, and to combine them into a single figure.",
    problem:
      "A manager receives a table of hundreds of bills and cannot see any pattern. The problem is to choose suitable charts that reveal trends, comparisons, spreads and relationships in the data clearly and honestly.",
    dataset: {
      name: "Restaurant Tips Dataset",
      source: "Seaborn built-in dataset: sns.load_dataset('tips')",
      records: "244 rows",
      features: "total_bill, tip, sex, smoker, day, time, size",
      types: "Floating-point numbers, integers and categorical text"
    },
    methodology: [
      "Load the dataset and choose a question for each chart.",
      "Draw a line chart and a bar chart for trends and comparisons.",
      "Draw a histogram and a box plot for distributions.",
      "Draw a scatter plot and heatmap for relationships.",
      "Add titles, axis labels and legends.",
      "Combine charts into a multi-panel figure."
    ],
    analysis:
      "Each chart is interpreted in words: what the axes show, what pattern is visible and what decision it supports. The experiment also compares different chart types for the same data to show their strengths.",
    results:
      "Students produce six well-labelled charts and one combined figure, and can explain the insight each chart provides.",
    architecture: ["Dataset", "Question", "Chart Selection", "Plotting", "Labelling and Styling", "Interpretation"],
    subs: [
      [
        "Line Plot",
        "To draw a line plot that shows a trend across ordered values.",
        "A line chart connects points in order, which makes it ideal for trends over time or sequence. Labelling both axes and adding a title tells the viewer exactly what is being shown.",
        "Prepare ordered x and y values|Call plt.plot|Add markers|Set title and axis labels|Add a grid and show the plot",
        `import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr", "May"]
sales = [120, 135, 150, 145, 170]

plt.plot(months, sales, marker="o")
plt.title("Monthly Sales")
plt.xlabel("Month")
plt.ylabel("Sales (units)")
plt.grid(True)
plt.show()`,
        `A line chart rising from 120 in January to 170 in May,
with a small dip in April.`,
        "The line shows an upward trend, with one dip in April. A line chart is the right choice because the months are ordered."
      ],
      [
        "Bar Chart",
        "To compare values across categories using a bar chart.",
        "A bar chart uses the length of each bar to compare categories. Bars should start at zero so that lengths are not exaggerated. Seaborn's barplot also adds an error bar showing the uncertainty of the average.",
        "Load the tips dataset|Choose day as the category|Choose total_bill as the value|Draw barplot|Add title and labels",
        `import seaborn as sns
import matplotlib.pyplot as plt

tips = sns.load_dataset("tips")

sns.barplot(data=tips, x="day", y="total_bill")
plt.title("Average Bill by Day")
plt.show()`,
        `Four bars (Thur, Fri, Sat, Sun) showing the average bill;
Sunday has the tallest bar.`,
        "Weekend bills are higher on average than weekday bills, which a table of raw numbers would not show at a glance."
      ],
      [
        "Histogram",
        "To visualise the distribution of a numeric variable.",
        "A histogram divides the range of values into bins and counts how many values fall into each bin. The shape shows whether the data is symmetric or skewed, and the bin count changes how detailed the picture looks.",
        "Select total_bill|Choose the number of bins|Draw histplot with a density curve|Label the axes|Describe the shape",
        `sns.histplot(tips["total_bill"], bins=20, kde=True)
plt.title("Distribution of Total Bill")
plt.xlabel("Total bill ($)")
plt.show()`,
        `A bell-shaped histogram with a long right tail;
most bills are between 10 and 25 dollars.`,
        "The right tail shows a few very large bills. Changing the bins from 20 to 5 would hide this detail."
      ],
      [
        "Scatter Plot",
        "To show the relationship between two numeric variables.",
        "A scatter plot places each row as a point with one variable on each axis. A rising cloud of points means a positive relationship, and colour can add a third variable such as time of day.",
        "Choose total_bill for x and tip for y|Draw scatterplot|Colour points by time|Add a title|Describe the pattern",
        `sns.scatterplot(data=tips, x="total_bill", y="tip", hue="time")
plt.title("Tip vs Total Bill")
plt.show()`,
        `A cloud of points rising to the right;
dinner and lunch points shown in different colours.`,
        "Tips increase with the bill, matching the correlation of about 0.68, but there is considerable spread around the trend."
      ],
      [
        "Box Plot",
        "To compare distributions and spot outliers using a box plot.",
        "A box plot shows the median, the quartiles and potential outliers in one compact picture. Drawing one box per category lets you compare the centre and spread of several groups side by side.",
        "Choose day and total_bill|Draw boxplot|Read median and quartiles|Identify outlier points|Compare spread between days",
        `sns.boxplot(data=tips, x="day", y="total_bill")
plt.title("Bill Distribution by Day")
plt.show()`,
        `Four boxes, one per day, with a few dots above the whiskers
showing unusually large bills.`,
        "Weekend boxes sit higher and are wider, so weekend bills are both larger and more varied. The dots above the whiskers are outliers."
      ],
      [
        "Heatmap of Correlations",
        "To display a correlation matrix as a colour-coded heatmap.",
        "A heatmap uses colour intensity to represent numbers in a grid. For a correlation matrix, strong positive values appear in one colour and weak values in another, which helps to find related variables quickly.",
        "Compute the correlation matrix|Pass it to sns.heatmap|Turn on annotation|Choose a colour map|Read the strongest pairs",
        `corr = tips.corr(numeric_only=True)

sns.heatmap(corr, annot=True, cmap="coolwarm", vmin=-1, vmax=1)
plt.title("Correlation Heatmap")
plt.show()`,
        `A 3 by 3 coloured grid for total_bill, tip and size,
with numbers printed in each cell.`,
        "The strongest pair is total_bill and tip. The diagonal is always 1 because every variable correlates perfectly with itself."
      ],
      [
        "Combining Charts in a Dashboard",
        "To combine several charts into a single multi-panel figure.",
        "The subplots function creates a grid of axes in one figure. Each chart is drawn on its own axis using the ax argument, and tight_layout prevents titles and labels from overlapping.",
        "Create a 2 by 2 grid with subplots|Draw a histogram on the first axis|Draw a scatter plot on the second|Draw a box plot on the third|Draw a bar chart on the fourth|Apply tight_layout",
        `fig, ax = plt.subplots(2, 2, figsize=(11, 8))

sns.histplot(tips["total_bill"], kde=True, ax=ax[0, 0])
sns.scatterplot(data=tips, x="total_bill", y="tip", ax=ax[0, 1])
sns.boxplot(data=tips, x="day", y="tip", ax=ax[1, 0])
sns.barplot(data=tips, x="day", y="tip", ax=ax[1, 1])

fig.suptitle("Tips Dashboard")
plt.tight_layout()
plt.show()`,
        `One figure containing four charts arranged in two rows
and two columns under the title "Tips Dashboard".`,
        "Showing the distribution, relationship and group comparison together gives a complete story in a single view."
      ]
    ]
  },

  /* ------------------------------------------------------------ 06 */
  {
    id: "06",
    name: "Machine Learning Fundamentals with Scikit-learn",
    topic: "Machine Learning Scikit-learn",
    tools: ["Python 3", "Scikit-learn", "Pandas", "NumPy", "Jupyter Notebook"],
    description:
      "This experiment gives a first practical introduction to machine learning with scikit-learn. The purpose is to let students train, test and evaluate simple models end to end. The problem being solved is learning to predict an outcome from data, such as the species of a flower from its measurements. Students use the classic Iris dataset with 150 samples, four numeric features and three classes. They split data into training and test sets, fit linear and logistic regression, K-nearest neighbours and decision tree models, group unlabelled data with K-means, and finally judge models using accuracy, confusion matrix and classification report. Key concepts are overfitting, supervised versus unsupervised learning and evaluation metrics. Learners finish able to build and compare models responsibly. These steps are the same ones used in fraud detection, recommendation and medical screening systems.",
    overview:
      "Machine learning builds models that learn patterns from data. This experiment covers the full beginner workflow: split the data, train supervised models for regression and classification, group data with an unsupervised algorithm and evaluate each model with suitable metrics.",
    aim: "To train, test and evaluate basic supervised and unsupervised machine learning models using scikit-learn.",
    problem:
      "A botanist wants to identify the species of an iris flower from four measurements, and to see whether the flowers naturally fall into groups. The problem is to build models that predict the species on unseen data and to measure how well they do so.",
    dataset: {
      name: "Iris Flower Dataset",
      source: "Scikit-learn built-in dataset: load_iris()",
      records: "150 rows (50 per species)",
      features: "sepal length, sepal width, petal length, petal width, species",
      types: "Four floating-point features and one class label (0, 1, 2)"
    },
    methodology: [
      "Load the dataset and separate the features from the target.",
      "Split the data into training and test sets.",
      "Train a regression model and a classification model.",
      "Train K-nearest neighbours and decision tree models.",
      "Apply K-means clustering without using the labels.",
      "Evaluate the models with accuracy, a confusion matrix and a classification report."
    ],
    analysis:
      "The experiment compares models on the same test data, studies which classes are confused with each other and discusses why testing on unseen data is essential. Clustering results are compared with the true species.",
    results:
      "Classification models reach an accuracy of roughly 95 to 100 percent on the test set, the regression model fits petal width closely, and K-means recovers three groups that match the species well.",
    architecture: ["Dataset", "Train-Test Split", "Model Training", "Prediction", "Evaluation", "Results"],
    files: [
      { name: "Experiment 06 - Model Evaluation Checklist.txt", type: "txt", url: "assets/files/experiment-06-evaluation-checklist.txt", size: "2.1 KB", date: "2026-10-07" }
    ],
    subs: [
      [
        "Train-Test Split",
        "To split a dataset into training and test sets.",
        "A model must be tested on data it has never seen, otherwise its score is too optimistic. The data is therefore divided into a training set used for learning and a test set used for the final check. A fixed random_state makes the split repeatable.",
        "Load the Iris dataset|Separate X and y|Call train_test_split with 20 percent test size|Print the shapes|Check the class balance",
        `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("Train:", X_train.shape, "Test:", X_test.shape)`,
        `Train: (120, 4) Test: (30, 4)`,
        "120 samples are used for learning and 30 for testing. Using stratify keeps the same share of each species in both parts."
      ],
      [
        "Linear Regression",
        "To fit a linear regression model and evaluate it with R-squared.",
        "Linear regression predicts a number by fitting a straight line through the data. Here petal length is used to predict petal width. The R-squared score shows what fraction of the variation the line explains, and a score near 1 means a close fit.",
        "Choose petal length as input and petal width as output|Split the data|Fit LinearRegression|Predict on the test set|Compute R-squared and error",
        `from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_squared_error

Xr = X[:, [2]]        # petal length
yr = X[:, 3]          # petal width
Xr_tr, Xr_te, yr_tr, yr_te = train_test_split(Xr, yr, test_size=0.2, random_state=42)

model = LinearRegression().fit(Xr_tr, yr_tr)
pred = model.predict(Xr_te)

print("R2:", round(r2_score(yr_te, pred), 2))
print("MSE:", round(mean_squared_error(yr_te, pred), 3))`,
        `R2: about 0.9
MSE: a small value, about 0.04`,
        "An R-squared near 0.9 means petal length explains most of the variation in petal width. The exact value changes slightly with the split."
      ],
      [
        "Logistic Regression Classifier",
        "To train a logistic regression classifier and measure its accuracy.",
        "Despite its name, logistic regression is a classification method. It estimates the probability of each class and predicts the most likely one. Accuracy is the share of test samples classified correctly.",
        "Split the data|Create LogisticRegression|Fit on the training set|Predict on the test set|Compute accuracy",
        `from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

clf = LogisticRegression(max_iter=200)
clf.fit(X_train, y_train)

pred = clf.predict(X_test)
print("Accuracy:", round(accuracy_score(y_test, pred), 2))`,
        `Accuracy: about 0.97 to 1.00`,
        "Almost every test flower is classified correctly, since the Iris species are well separated by their measurements."
      ],
      [
        "K-Nearest Neighbours",
        "To classify samples with the K-nearest neighbours algorithm.",
        "KNN predicts the class of a sample by looking at the k closest training samples and taking a majority vote. The choice of k matters: a very small k is sensitive to noise, and a very large k blurs the boundaries.",
        "Scale the features|Create KNN with k = 5|Fit on the training data|Predict test samples|Try k values from 1 to 10",
        `from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler().fit(X_train)
Xtr, Xte = scaler.transform(X_train), scaler.transform(X_test)

for k in [1, 3, 5, 7, 9]:
    knn = KNeighborsClassifier(n_neighbors=k).fit(Xtr, y_train)
    print("k =", k, "accuracy =", round(knn.score(Xte, y_test), 2))`,
        `k = 1 to 9: accuracy about 0.93 to 1.00 for each value of k`,
        "KNN depends on distances, so the features are scaled first. Accuracy stays high across several values of k, showing a stable model."
      ],
      [
        "Decision Tree Classifier",
        "To train a decision tree and inspect which features matter.",
        "A decision tree asks a series of yes or no questions about the features to reach a class. It is easy to interpret, but a very deep tree can memorise the training data, which is called overfitting. Limiting max_depth reduces this risk.",
        "Create DecisionTreeClassifier with max_depth = 3|Fit on the training set|Predict and score on the test set|Print feature importances|Discuss overfitting",
        `from sklearn.tree import DecisionTreeClassifier
from sklearn.datasets import load_iris

names = load_iris().feature_names
tree = DecisionTreeClassifier(max_depth=3, random_state=42)
tree.fit(X_train, y_train)

print("Accuracy:", round(tree.score(X_test, y_test), 2))
for n, imp in zip(names, tree.feature_importances_):
    print(n, round(imp, 2))`,
        `Accuracy: about 0.93 to 1.00
Petal length and petal width carry most of the importance.`,
        "The petal measurements decide almost every split, which agrees with the strong separation seen in the visualisation experiment."
      ],
      [
        "K-Means Clustering",
        "To group unlabelled data into clusters using K-means.",
        "K-means is an unsupervised algorithm: it never sees the labels. It places k centres, assigns every point to its nearest centre and moves the centres until they stop changing. Comparing the clusters with the true species shows how natural the groups are.",
        "Select the four features|Create KMeans with 3 clusters|Fit without labels|Inspect cluster sizes|Compare clusters with the real species",
        `from sklearn.cluster import KMeans
import pandas as pd

km = KMeans(n_clusters=3, n_init=10, random_state=42)
clusters = km.fit_predict(X)

print("Cluster sizes:", pd.Series(clusters).value_counts().tolist())
print(pd.crosstab(y, clusters))`,
        `Cluster sizes: about 62, 50 and 38 (order may vary)
One species forms a perfectly separate cluster;
the other two overlap slightly.`,
        "Setosa is separated perfectly, while versicolor and virginica overlap a little. This matches how K-means behaves on Iris."
      ],
      [
        "Model Evaluation Metrics",
        "To evaluate a classifier using a confusion matrix and classification report.",
        "Accuracy alone can hide mistakes. A confusion matrix counts correct and wrong predictions for every class, and the classification report adds precision, recall and F1-score. Together they show exactly where the model fails.",
        "Train a classifier|Predict the test set|Print the confusion matrix|Print the classification report|Identify the most confused classes",
        `from sklearn.metrics import confusion_matrix, classification_report

clf = LogisticRegression(max_iter=200).fit(X_train, y_train)
pred = clf.predict(X_test)

print(confusion_matrix(y_test, pred))
print(classification_report(y_test, pred, target_names=["setosa", "versicolor", "virginica"]))`,
        `Confusion matrix: large numbers on the diagonal and zero or one
errors off the diagonal.
Report: precision, recall and F1 close to 1.00 for each species.`,
        "Mistakes, if any, occur between versicolor and virginica. Reading per-class metrics is more informative than a single accuracy figure."
      ]
    ]
  },
  
  /* ------------------------------------------------------------ 07 */
  {
    id: "07",
    name: "Data Grouping and Aggregation",
    topic: "Pandas GroupBy Aggregation",
    tools: ["Python 3", "Pandas", "Jupyter Notebook"],
    description:
      "Learn how to split a dataset into meaningful groups and summarise each group with Pandas groupby, multi-key grouping and aggregate statistics.",
    overview:
      "Real datasets are usually analysed group by group: average marks per department, total sales per region, or summary statistics per species. Pandas groupby performs the split-apply-combine workflow that makes this possible in a few lines. This experiment moves from single-key grouping to multi-key grouping and custom aggregate functions.",
    aim:
      "To group tabular data by one or more keys and calculate summary statistics for each group using Pandas.",
    problem:
      "A flat table hides useful structure. An examiner, manager or analyst needs the same measure computed separately for every category, and doing that with manual loops is slow and error-prone.",
    dataset: {
      name: "Student marks table and the Iris flower dataset",
      source: "A small table created in Python plus the public Iris dataset",
      records: "8 student rows, then 150 Iris rows",
      features: "Name, Department, Year, Marks, Attendance; sepal and petal measurements",
      types: "Text categories and numeric measurements"
    },
    methodology: [
      "Create a small student-marks DataFrame.",
      "Group by a single key and inspect each group.",
      "Group by multiple keys to build a finer breakdown.",
      "Apply sum, mean and standard deviation with aggregate().",
      "Repeat single-key and multi-key grouping on the Iris dataset."
    ],
    analysis:
      "The grouped averages are compared with the overall average to show how a single figure can hide differences between departments. The Iris analysis compares species using count, sum, mean, standard deviation, minimum and maximum.",
    results:
      "A per-department and per-department-year average marks table, a multi-metric summary of marks and attendance, and a complete species-level statistical profile of the Iris measurements.",
    architecture: [
      "Flat DataFrame",
      "Split by Key",
      "Apply Aggregation",
      "Combine Groups",
      "Grouped Summary"
    ],
    files: [
      { name: "Experiment 07 - GroupBy Notebook (DS-Ex7.ipynb)", type: "ipynb", url: "assets/files/imported/DS-Ex7.ipynb", size: "13.6 KB", date: "2026-11-05" }
    ],
    subs: [
      [
        "Grouping by a Single and Multiple Keys",
        "To split a DataFrame into groups and inspect the records inside each group.",
        "groupby() partitions rows that share a key value. Iterating over the resulting object yields the key and the matching rows. Passing a list of column names groups by the combination of values, which produces a finer breakdown than a single key.",
        "Create the student DataFrame|Group by Department and print each group|Calculate average marks per department|Group by Department and Year|Print the multi-key averages",
        `import pandas as pd

data = {
    "Name": ["Ravi", "Sita", "Arun", "Priya",
             "Kiran", "Anil", "Lakshmi", "Rahul"],
    "Department": ["CSE", "CSE", "ECE", "ECE",
                   "CSE", "ECE", "CSE", "ECE"],
    "Year": [2, 2, 3, 3, 2, 3, 3, 2],
    "Marks": [85, 90, 78, 88, 75, 82, 95, 70]
}

df = pd.DataFrame(data)
print("Original DataFrame:")
print(df)

print("\\n1. Group by Department:")
for name, group in df.groupby("Department"):
    print("\\nDepartment:", name)
    print(group)

print("\\nAverage Marks by Department:")
print(df.groupby("Department")["Marks"].mean())

print("\\n2. Group by Department and Year:")
for name, group in df.groupby(["Department", "Year"]):
    print("\\nGroup:", name)
    print(group)

print("\\nAverage Marks by Department and Year:")
print(df.groupby(["Department", "Year"])["Marks"].mean())`,
        `Average Marks by Department:
Department
CSE    86.25
ECE    79.50
Name: Marks, dtype: float64

Average Marks by Department and Year:
Department  Year
CSE         2       83.333333
            3       95.000000
ECE         2       70.000000
            3       82.666667
Name: Marks, dtype: float64`,
        "CSE averages 86.25 and ECE 79.50, but the multi-key view shows that CSE Year 2 actually scores below CSE Year 3. Grouping at a finer level exposes differences the single key conceals."
      ],
      [
        "Aggregating Summary Statistics by Group",
        "To compute several statistics for every group in one call.",
        "aggregate() accepts a dictionary that maps each column to the statistics that should be calculated. The result is a multi-level table containing, for example, the sum, mean and standard deviation of both marks and attendance for every department.",
        "Build a marks and attendance DataFrame|Group by Department|Apply sum, mean and std to both columns|Display the summary table",
        `import pandas as pd

data = {
    "Department": ["CSE", "CSE", "CSE",
                   "ECE", "ECE", "ECE",
                   "EEE", "EEE", "EEE"],
    "Marks": [80, 75, 85, 70, 65, 75, 90, 85, 95],
    "Attendance": [90, 85, 95, 80, 75, 85, 95, 90, 100]
}

df = pd.DataFrame(data)

result = df.groupby("Department").aggregate({
    "Marks": ["sum", "mean", "std"],
    "Attendance": ["sum", "mean", "std"]
})

print("Original DataFrame:")
print(df)
print("\\nSummary Statistics:")
print(result)`,
        `           Marks            Attendance
             sum  mean  std        sum  mean  std
Department
CSE          240  80.0  5.0        270  90.0  5.0
ECE          210  70.0  5.0        240  80.0  5.0
EEE          270  90.0  5.0        285  95.0  5.0`,
        "Each department is summarised by six numbers. The standard deviation of 5.0 in every group shows that the marks and attendance values are equally spread within each department."
      ],
      [
        "GroupBy Analysis of the Iris Dataset",
        "To apply single-key and multi-key grouping to a real dataset and compare species.",
        "The Iris dataset stores four measurements for 150 flowers across three species. Grouping by species turns a flat measurement table into a per-species profile, while grouping by species and sepal width shows how a second key splits each species further.",
        "Load the Iris dataset|Display the first rows and describe() summary|Group by species and aggregate sepal length|Group by species and sepal width|Print per-species means and maximums",
        `import pandas as pd

url = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv"
df = pd.read_csv(url)

print("First 5 Records:")
print(df.head())

print("\\nStatistical Summary:")
print(df.describe())

print("\\n1. GroupBy using a Single Column:")
print(df.groupby("species")["sepal_length"].agg(
    ["count", "sum", "mean", "std", "min", "max"]
))

print("\\n2. GroupBy using Multiple Columns:")
print(df.groupby(["species", "sepal_width"])["sepal_length"].mean().head(15))

print("\\n3. Records in Each Species:")
print(df["species"].value_counts())

print("\\nAverage Petal Length by Species:")
print(df.groupby("species")["petal_length"].mean())

print("\\nAverage Petal Width by Species:")
print(df.groupby("species")["petal_width"].mean())

print("\\nMaximum Sepal Length by Species:")
print(df.groupby("species")["sepal_length"].max())`,
        `1. GroupBy using a Single Column:
          count   sum   mean       std  min  max
species
setosa       50  250.3  5.006  0.352490  4.3  5.8
versicolor   50  296.8  5.936  0.516171  4.9  7.0
virginica    50  329.4  6.588  0.635880  4.9  7.9

3. Records in Each Species:
setosa        50
versicolor    50
virginica     50

Average Petal Length by Species:
setosa        1.464
versicolor    4.260
virginica     5.552

Average Petal Width by Species:
setosa        0.246
versicolor    1.326
virginica     2.026

Maximum Sepal Length by Species:
setosa        5.8
versicolor    7.0
virginica     7.9`,
        "Petal length and width separate the three species far more clearly than sepal length: setosa petals are short and narrow, while virginica petals are longest and widest. Grouped summaries are therefore a quick way to find which measurements carry real information."
      ]
    ]
  },

  /* ------------------------------------------------------------ 08 */
  {
    id: "08",
    name: "Web Scraping and Sentiment Analysis",
    topic: "BeautifulSoup NLP VADER Sentiment Analysis",
    tools: ["Python 3", "BeautifulSoup", "Pandas", "NLTK", "vaderSentiment", "Matplotlib", "Seaborn", "WordCloud"],
    description:
      "Extract product reviews from an HTML page, then analyse the text with word clouds, token statistics and VADER sentiment scoring.",
    overview:
      "Unstructured text is one of the richest data sources in data science. This experiment builds a small text-analysis pipeline: BeautifulSoup extracts review text from saved HTML, Pandas stores it as a table, and NLTK plus VADER quantify sentiment. Word clouds and distribution charts make the patterns visible.",
    aim:
      "To scrape review text from HTML and measure the sentiment, vocabulary and structure of that text using Python.",
    problem:
      "Customer opinions arrive as free text rather than numbers. An analyst needs a repeatable way to collect the reviews, classify each one as positive or negative, and summarise the reasons behind the scores.",
    dataset: {
      name: "Sample product reviews",
      source: "reviews.html (a saved page of illustrative reviews) converted to product_reviews.csv",
      records: "20 reviews",
      features: "title, review, rating",
      types: "Text and short category labels"
    },
    methodology: [
      "Parse the saved HTML with BeautifulSoup and select each review block.",
      "Store the extracted title, review and rating in a DataFrame.",
      "Generate word clouds for all, positive and negative reviews.",
      "Count words, characters, numeric tokens and stopwords.",
      "Score every review with NLTK VADER and the standalone vaderSentiment package.",
      "Visualise sentiment intensity and save the analysis outputs."
    ],
    analysis:
      "The experiment compares the two VADER implementations, inspects how compound scores separate positive from negative reviews, and uses stopword frequency and word statistics to describe the vocabulary.",
    results:
      "A 20-row review table, word-cloud images, text-statistics distributions, a sentiment table and a scatter plot of compound scores. VADER classifies 12 reviews as positive and 8 as negative.",
    architecture: [
      "HTML Page",
      "BeautifulSoup Extraction",
      "Review DataFrame",
      "Text Statistics and Word Clouds",
      "VADER Sentiment Scoring",
      "Visualisation and Export"
    ],
    files: [
      { name: "Experiment 08 - Sentiment Analysis Notebook (DS-Ex8.ipynb)", type: "ipynb", url: "assets/files/imported/DS-Ex8.ipynb", size: "1.2 MB", date: "2026-11-05" },
      { name: "Experiment 08 - Reviews page (reviews.html)", type: "html", url: "assets/files/imported/experiment-08-reviews.html", size: "4.4 KB", date: "2026-11-05" },
      { name: "Experiment 08 - Product reviews (product_reviews.csv)", type: "csv", url: "assets/files/imported/experiment-08-product-reviews.csv", size: "1.9 KB", date: "2026-11-05" },
      { name: "Experiment 08 - Sample reviews (sample_reviews.csv)", type: "csv", url: "assets/files/imported/experiment-08-sample-reviews.csv", size: "1.9 KB", date: "2026-11-05" }
    ],
    subs: [
      [
        "Extracting Reviews with BeautifulSoup",
        "To read an HTML page and turn repeated review blocks into a structured table.",
        "BeautifulSoup builds a searchable tree from HTML. select() finds every element with the review class, and select_one() pulls the title, text and rating from inside each block. The cleaned records are then written to CSV.",
        "Open the saved reviews.html file|Parse it with BeautifulSoup|Select every review block|Extract title, review text and rating|Build a DataFrame and save product_reviews.csv",
        `from bs4 import BeautifulSoup
import pandas as pd

with open("reviews.html", "r", encoding="utf-8") as file:
    html_content = file.read()

soup = BeautifulSoup(html_content, "html.parser")
review_blocks = soup.select(".review")
records = []

for block in review_blocks:
    review_element = block.select_one(".review-text")
    rating_element = block.select_one(".rating")
    title_element = block.select_one(".review-title")

    review = review_element.get_text(" ", strip=True) if review_element else ""
    rating = rating_element.get_text(" ", strip=True) if rating_element else ""
    title = title_element.get_text(" ", strip=True) if title_element else ""

    if review:
        records.append({"title": title, "review": review, "rating": rating})

df = pd.DataFrame(records)
df.to_csv("product_reviews.csv", index=False, encoding="utf-8-sig")

print(df.head())
print("Total reviews extracted:", len(df))`,
        `             title                                             review     rating
0    Great product  Excellent quality and very useful product. Del...  5 out of 5
1     Poor quality  Poor quality and the product stopped working a...  2 out of 5
2     Worth buying  Good performance and excellent value for money...  4 out of 5
3   Bad experience  Very bad product. I am disappointed and custom...  1 out of 5
4  Excellent value  Great product with amazing features and a clea...  5 out of 5

Total reviews extracted: 20`,
        "Every repeated review block was captured with its title, text and rating. Selecting by CSS class is robust because it does not depend on the exact position of a review on the page."
      ],
      [
        "Word Clouds and VADER Sentiment",
        "To summarise review vocabulary visually and label each review as positive or negative.",
        "A word cloud sizes words by frequency, giving an instant impression of the dominant terms. VADER returns a compound score between -1 and +1; scores of at least 0.05 are treated as positive and scores of -0.05 or below as negative.",
        "Load the review CSV|Create a VADER analyser and classify each review|Join all reviews into one string|Generate word clouds for all, positive and negative reviews|Save the labelled table",
        `import pandas as pd
import matplotlib.pyplot as plt
from wordcloud import WordCloud
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

df = pd.read_csv("product_reviews.csv")
df["review"] = df["review"].fillna("").astype(str)

analyzer = SentimentIntensityAnalyzer()

def classify_sentiment(text):
    score = analyzer.polarity_scores(text)["compound"]
    if score >= 0.05:
        return "Positive"
    if score <= -0.05:
        return "Negative"
    return "Neutral"

df["sentiment"] = df["review"].apply(classify_sentiment)

def generate_wordcloud(text, title, filename):
    if not text.strip():
        print("No text available for:", title)
        return
    cloud = WordCloud(width=1200, height=600, background_color="white",
                      max_words=150, collocations=False).generate(text)
    plt.figure(figsize=(12, 6))
    plt.imshow(cloud, interpolation="bilinear")
    plt.axis("off")
    plt.title(title)
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    plt.show()

generate_wordcloud(" ".join(df["review"]), "WordCloud - All Reviews", "wordcloud_all.png")
generate_wordcloud(" ".join(df.loc[df["sentiment"] == "Positive", "review"]),
                   "WordCloud - Positive Reviews", "wordcloud_positive.png")
generate_wordcloud(" ".join(df.loc[df["sentiment"] == "Negative", "review"]),
                   "WordCloud - Negative Reviews", "wordcloud_negative.png")

df.to_csv("product_reviews_analyzed.csv", index=False)
print(df["sentiment"].value_counts())`,
        `sentiment
Positive    12
Negative     8
Name: count, dtype: int64
WordCloud images saved successfully.`,
        "VADER separates the reviews into 12 positive and 8 negative examples. The positive cloud is dominated by words such as great, good and excellent, while the negative cloud highlights poor, bad and disappointing."
      ],
      [
        "Text Statistics and Distributions",
        "To measure the length and vocabulary of every review.",
        "Regular expressions split text into tokens. Counting words, characters, numeric tokens and stopwords describes how reviews are written, and a histogram shows whether the values are concentrated or spread out.",
        "Download the NLTK stopword list|Tokenise every review|Count words, characters, numbers and stopwords|Plot histograms for each statistic|Print the most frequent stopwords",
        `import re
import pandas as pd
import nltk
import matplotlib.pyplot as plt
import seaborn as sns
from nltk.corpus import stopwords
from collections import Counter

nltk.download("stopwords", quiet=True)

df = pd.read_csv("product_reviews.csv")
df["review"] = df["review"].fillna("").astype(str)
stop_words = set(stopwords.words("english"))

def analyze_review(text):
    tokens = re.findall(r"\\b[\\w']+\\b", text.lower())
    words = re.findall(r"\\b[A-Za-z]+\\b", text)
    numeric_tokens = re.findall(r"\\b\\d+(?:\\.\\d+)?\\b", text)
    stopword_tokens = [t for t in tokens if t in stop_words]
    return pd.Series({
        "word_count": len(tokens),
        "character_count": len(text),
        "numeric_count": len(numeric_tokens),
        "stopword_count": len(stopword_tokens),
        "average_word_length": (sum(len(w) for w in words) / len(words)) if words else 0
    })

df = pd.concat([df, df["review"].apply(analyze_review)], axis=1)
df.to_csv("review_statistics.csv", index=False)

for column in ["stopword_count", "numeric_count", "word_count",
               "character_count", "average_word_length"]:
    sns.histplot(data=df, x=column, kde=True, bins=20)
    plt.title(column)
    plt.show()

all_tokens = re.findall(r"\\b[\\w']+\\b", " ".join(df["review"]).lower())
stopword_frequency = Counter(t for t in all_tokens if t in stop_words)
print("Top 10 stopwords:")
print(stopword_frequency.most_common(10))`,
        `Top 10 stopwords:
[('and', 19), ('the', 16), ('is', 10), ('it', 7), ('was', 5), ('i', 5), ('very', 4), ('for', 4), ('after', 3), ('not', 3)]

Descriptive statistics:
       stopword_count  numeric_count  word_count  character_count  average_word_length
count       20.000000      20.000000   20.000000         20.00000            20.000000
mean         4.600000       0.300000   11.450000         67.10000             4.975126
std          2.280351       0.470162    2.064104          8.44736             0.922489
min          1.000000       0.000000    7.000000         52.00000             3.769231
max          8.000000       1.000000   15.000000         85.00000             6.857143`,
        "Reviews average about 11 words and 67 characters, and stopwords such as and, the and is account for a large share of the tokens. Removing stopwords before modelling would therefore focus any later analysis on meaningful terms."
      ],
      [
        "Comparing NLTK VADER and Standalone VADER",
        "To check whether two implementations of the same sentiment model agree.",
        "NLTK bundles a VADER analyser, and the vaderSentiment package provides another. Both return pos, neg, neu and compound scores for a piece of text. Comparing their outputs side by side confirms consistency and teaches that library implementations can be validated against each other.",
        "Load the review CSV|Create both analysers|Score every review with each analyser|Classify compound scores|Compare the two distributions|Save the combined results",
        `import pandas as pd
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer as NLTKVADER
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer as StandaloneVADER

nltk.download("vader_lexicon", quiet=True)

df = pd.read_csv("product_reviews.csv")
df["review"] = df["review"].fillna("").astype(str)
nltk_analyzer = NLTKVADER()
vader_analyzer = StandaloneVADER()

def classify(score):
    if score >= 0.05:
        return "Positive"
    if score <= -0.05:
        return "Negative"
    return "Neutral"

nltk_scores = df["review"].apply(nltk_analyzer.polarity_scores)
vader_scores = df["review"].apply(vader_analyzer.polarity_scores)

df["nltk_compound"] = nltk_scores.apply(lambda x: x["compound"])
df["vader_compound"] = vader_scores.apply(lambda x: x["compound"])
df["nltk_sentiment"] = df["nltk_compound"].apply(classify)
df["vader_sentiment"] = df["vader_compound"].apply(classify)

print(df[["review", "nltk_compound", "nltk_sentiment",
          "vader_compound", "vader_sentiment"]].head(10).to_string(index=False))
print("\\nNLTK sentiment distribution:")
print(df["nltk_sentiment"].value_counts())
print("\\nStandalone VADER sentiment distribution:")
print(df["vader_sentiment"].value_counts())

df.to_csv("sentiment_analysis_results.csv", index=False)`,
        `NLTK sentiment distribution:
Positive    12
Negative     8

Standalone VADER sentiment distribution:
Positive    12
Negative     8

Results saved to sentiment_analysis_results.csv`,
        "Both implementations produced identical compound scores for every review, so the two libraries can be used interchangeably here. Identical distributions are strong evidence that the pipeline is correct."
      ],
      [
        "Visualising Sentiment Intensity",
        "To plot every review's compound score and see how far it sits from the neutral band.",
        "A scatter plot with review index on the x-axis and compound score on the y-axis shows the strength as well as the direction of sentiment. Horizontal reference lines at +0.05 and -0.05 mark the positive and negative thresholds.",
        "Load sentiment_analysis_results.csv|Convert compound scores to numbers|Number each review|Plot compound score coloured by sentiment|Draw the positive, negative and neutral reference lines|Save the chart",
        `import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv("sentiment_analysis_results.csv")
df["vader_compound"] = pd.to_numeric(df["vader_compound"], errors="coerce")
df = df.dropna(subset=["vader_compound"]).reset_index(drop=True)
df["review_index"] = range(1, len(df) + 1)

palette = {"Positive": "green", "Negative": "red", "Neutral": "gray"}

plt.figure(figsize=(14, 7))
sns.scatterplot(data=df, x="review_index", y="vader_compound",
                hue="vader_sentiment", palette=palette, s=70, alpha=0.8)

plt.axhline(y=0.05, color="green", linestyle="--", label="Positive threshold")
plt.axhline(y=-0.05, color="red", linestyle="--", label="Negative threshold")
plt.axhline(y=0, color="black", linestyle=":", label="Neutral reference")

plt.ylim(-1.05, 1.05)
plt.xlabel("Review Index")
plt.ylabel("VADER Compound Sentiment Score")
plt.title("Sentiment Intensity of Product Reviews")
plt.legend(loc="best")
plt.grid(alpha=0.25)
plt.tight_layout()
plt.savefig("sentiment_intensity_scatter.png", dpi=300)
plt.show()`,
        `Scatter intensity plot saved successfully.`,
        "Most points sit close to +1 or -1, showing that the reviews use strongly polarised language. No review lands inside the neutral band, which matches the earlier counts of 12 positive and 8 negative."
      ]
    ]
  },

  /* ------------------------------------------------------------ 09 */
  {
    id: "09",
    name: "Customer Segmentation using K-Means Clustering",
    topic: "K-Means Clustering Customer Segmentation",
    tools: ["Python 3", "Pandas", "Scikit-learn", "Matplotlib", "Seaborn", "Jupyter Notebook"],
    description:
      "Segment customers into groups using K-Means clustering, choosing the number of clusters with the elbow method and silhouette score.",
    overview:
      "Clustering is unsupervised learning: no labels are given, and the algorithm discovers structure in the data. K-Means repeatedly assigns points to the nearest centroid and moves each centroid to the mean of its members. This experiment applies that idea to customer income and spending data.",
    aim:
      "To group customers with similar income and spending behaviour using K-Means and to choose a sensible number of clusters.",
    problem:
      "A marketing team cannot design one campaign for thousands of customers. It needs a small number of meaningful segments, each described by typical income and spending levels, so that campaigns and offers can be targeted.",
    dataset: {
      name: "Marketing campaign customer data",
      source: "Public marketing_campaign.csv dataset",
      records: "2,240 customers, 29 columns",
      features: "Income, MntWines, MntFruits, MntMeatProducts, MntFishProducts, MntSweetProducts, MntGoldProds",
      types: "Numeric measurements"
    },
    methodology: [
      "Load the marketing campaign dataset.",
      "Select the income and product-spending columns.",
      "Impute missing values and clip extreme values.",
      "Standardise the features so no column dominates.",
      "Compare K from 2 to 7 using inertia and silhouette score.",
      "Train the final model, profile the segments and save the results."
    ],
    analysis:
      "The elbow curve shows how within-cluster inertia falls as K grows, while the silhouette score measures how well separated the clusters are. The best-scoring K is then profiled by averaging each original feature per segment.",
    results:
      "The silhouette score is highest at K = 2 (0.481). The two segments differ sharply: one has a mean income near 41,244 and low spending, the other a mean income near 73,454 with spending several times higher.",
    architecture: [
      "Raw Customer Data",
      "Feature Selection and Cleaning",
      "Standardisation",
      "Elbow and Silhouette Search",
      "K-Means Model",
      "Segment Profiles and Charts"
    ],
    files: [
      { name: "Experiment 09 - Customer Segmentation Notebook (DS-9.ipynb)", type: "ipynb", url: "assets/files/imported/DS-9.ipynb", size: "108.4 KB", date: "2026-11-05" }
    ],
    subs: [
      [
        "Loading and Preparing Customer Data",
        "To clean and standardise the customer features before clustering.",
        "K-Means measures distance, so columns with large raw values would dominate. Missing income values are replaced with the column median, extreme values are clipped to the 1st and 99th percentiles, and StandardScaler puts every feature on the same scale.",
        "Load marketing_campaign.csv|Select the income and spending columns|Fill missing values with the median|Clip the 1st and 99th percentiles|Standardise the feature matrix",
        `import pandas as pd
from sklearn.preprocessing import StandardScaler

url = "https://raw.githubusercontent.com/johng034/customer-segmentation/master/marketing_campaign.csv"
df = pd.read_csv(url, sep=",")

features = [
    "Income", "MntWines", "MntFruits", "MntMeatProducts",
    "MntFishProducts", "MntSweetProducts", "MntGoldProds"
]

data = df[features].copy()
data = data.fillna(data.median())
data = data.clip(lower=data.quantile(0.01),
                 upper=data.quantile(0.99), axis=1)

X = StandardScaler().fit_transform(data)

print("Dataset shape:", df.shape)
print("Prepared feature matrix:", X.shape)`,
        `Dataset shape: (2240, 29)
Prepared feature matrix: (2240, 7)`,
        "The cleaned matrix has 2,240 rows and 7 standardised features. Standardisation is essential: without it, income (tens of thousands) would overwhelm spending columns measured in hundreds."
      ],
      [
        "Choosing K with the Elbow Method and Silhouette Score",
        "To evaluate several cluster counts and select the best one.",
        "Inertia is the sum of squared distances from each point to its cluster centre, so it always falls as K rises. The elbow method looks for the point where further clusters stop helping. The silhouette score measures separation and reaches its maximum at the most distinct grouping.",
        "Loop K from 2 to 7|Fit K-Means for each K|Record inertia and silhouette score|Plot the elbow curve|Select the K with the highest silhouette score",
        `import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

inertias = []
scores = []

for k in range(2, 8):
    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model.fit_predict(X)
    inertias.append(model.inertia_)
    scores.append(silhouette_score(X, labels))

plt.plot(range(2, 8), inertias, marker="o")
plt.xlabel("Number of Clusters (K)")
plt.ylabel("Inertia")
plt.title("Elbow Method")
plt.show()

print("Silhouette scores:", dict(zip(range(2, 8), scores)))

best_k = list(range(2, 8))[scores.index(max(scores))]
print("Best number of clusters:", best_k)`,
        `Silhouette scores: {2: 0.4811241347524294, 3: 0.3970290774895379, 4: 0.36830543242775043, 5: 0.34062159504770945, 6: 0.34227709867700146, 7: 0.26872868005477607}
Best number of clusters: 2`,
        "Two clusters give the highest silhouette score (0.481) and a clear elbow. Adding more clusters lowers the score, so the data supports a simple high-value versus lower-value split."
      ],
      [
        "Training K-Means and Profiling Segments",
        "To fit the final model and describe each segment using the original features.",
        "Once K is chosen, K-Means assigns every customer to the nearest centroid. Grouping the original (unscaled) data by segment and averaging each column produces an interpretable profile for marketing.",
        "Train K-Means with the best K|Assign a segment label to every customer|Group by segment|Average each feature|Display the profile table",
        `import pandas as pd
from sklearn.cluster import KMeans

best_k = 2
kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
df["Customer_Segment"] = kmeans.fit_predict(X)

summary = df.groupby("Customer_Segment")[features].mean().round(2)

print("Best number of clusters:", best_k)
print("\\nCustomer Segment Summary:")
print(summary)`,
        `Best number of clusters: 2

Customer Segment Summary:
                    Income  MntWines  MntFruits  MntMeatProducts  MntFishProducts  MntSweetProducts  MntGoldProds
Customer_Segment
0                 41244.22    145.50       7.42            48.00            10.51              7.35         25.19
1                 73453.89    610.02      62.77           396.75            89.71             65.16         80.40`,
        "Segment 1 earns about 78% more and spends roughly four to eight times more on every product category. Segment 0 is a price-sensitive group, while segment 1 is the high-value group worth premium campaigns."
      ],
      [
        "Visualising and Saving the Segments",
        "To inspect the clusters visually and export the labelled data.",
        "A scatter plot of income against wine spending, coloured by segment, shows how cleanly the two groups separate. Saving the labelled table and the profile summary makes the result reusable in reporting.",
        "Plot Income against MntWines coloured by segment|Add a title|Save the figure|Write customer_segments.csv|Write segment_summary.csv",
        `import matplotlib.pyplot as plt
import seaborn as sns

sns.scatterplot(data=df, x="Income", y="MntWines",
                hue="Customer_Segment", palette="Set2")
plt.title("Customer Segments by Income and Wine Spending")
plt.show()

df.to_csv("customer_segments.csv", index=False)
summary.to_csv("segment_summary.csv")
print("Files saved: customer_segments.csv and segment_summary.csv")`,
        `Analysis completed successfully!
Files saved: customer_segments.csv and segment_summary.csv`,
        "The plot shows two well-separated bands: low income with low wine spending and high income with high wine spending. Saving both the labelled data and the summary keeps the analysis reproducible."
      ]
    ]
  },

  /* ------------------------------------------------------------ 10 */
  {
    id: "10",
    name: "Emotion Detection using Machine Learning",
    topic: "NLP Text Classification Emotion Detection",
    tools: ["Python 3", "Pandas", "Scikit-learn", "Jupyter Notebook"],
    description:
      "Build a text-classification pipeline that predicts the emotion behind a sentence and maps each prediction to an emoji.",
    overview:
      "Text classification turns sentences into features and learns which features belong to which category. This experiment uses TF-IDF to weight words and word pairs, then trains logistic regression to recognise six emotions: happy, sadness, anger, fear, love and surprise.",
    aim:
      "To train and evaluate a TF-IDF + logistic regression model that detects emotion in short text.",
    problem:
      "Messages, reviews and comments carry emotion that is not written as a number. A program that can label the emotion automatically supports chatbots, moderation and feedback analysis.",
    dataset: {
      name: "Labelled emotion sentences",
      source: "18 short sentences created in Python",
      records: "18 sentences, 3 per emotion",
      features: "text, emotion",
      types: "Text and category label"
    },
    methodology: [
      "Create a small balanced dataset of labelled sentences.",
      "Split it into training and test sets, keeping every emotion represented.",
      "Convert text to TF-IDF features using single words and word pairs.",
      "Train a logistic regression classifier.",
      "Measure accuracy and inspect the classification report.",
      "Predict new sentences and display the matching emoji."
    ],
    analysis:
      "Accuracy alone is not enough on a tiny dataset, so the per-class precision, recall and F1 scores are examined. The predictions on unseen sentences show where the model generalises and where it confuses similar emotions.",
    results:
      "The model reaches 33.33% test accuracy with only two sentences per emotion available for training. Predictions are reasonable for clear examples such as loneliness, but similar sentences are sometimes confused.",
    architecture: [
      "Labelled Sentences",
      "Train/Test Split",
      "TF-IDF Vectoriser",
      "Logistic Regression",
      "Emotion Prediction",
      "Emoji Output"
    ],
    files: [
      { name: "Experiment 10 - Emotion Detection Notebook (DS_Exp_10.ipynb)", type: "ipynb", url: "assets/files/imported/DS_Exp_10.ipynb", size: "4.9 KB", date: "2026-11-05" }
    ],
    subs: [
      [
        "Building the Emotion Dataset",
        "To create a balanced labelled text dataset and split it for training and testing.",
        "The dataset contains three sentences for each of six emotions. stratify keeps the same class balance in the test set, which matters because with so few examples an unlucky split could omit an emotion entirely.",
        "Create the text and emotion lists|Build a DataFrame|Split into train and test with stratification|Print the class counts and split sizes",
        `import pandas as pd
from sklearn.model_selection import train_test_split

data = {
    "text": [
        "I am very happy today",
        "This is a wonderful day",
        "I feel cheerful and excited",
        "I am sad and lonely",
        "I feel very disappointed",
        "I miss my family so much",
        "I am angry with you",
        "This makes me furious",
        "I hate this situation",
        "I am scared of the dark",
        "I am afraid of losing",
        "I feel nervous and frightened",
        "I love you so much",
        "You mean everything to me",
        "I adore spending time with you",
        "Wow this is unbelievable",
        "I did not expect this surprise",
        "What an amazing unexpected gift"
    ],
    "emotion": [
        "happy", "happy", "happy",
        "sadness", "sadness", "sadness",
        "anger", "anger", "anger",
        "fear", "fear", "fear",
        "love", "love", "love",
        "surprise", "surprise", "surprise"
    ]
}

df = pd.DataFrame(data)
X_train, X_test, y_train, y_test = train_test_split(
    df["text"], df["emotion"], test_size=0.33,
    random_state=42, stratify=df["emotion"]
)

print(df["emotion"].value_counts())
print("Training rows:", len(X_train), "| Test rows:", len(X_test))`,
        `emotion
happy       3
sadness     3
anger       3
fear        3
love        3
surprise    3
Name: count, dtype: int64
Training rows: 12 | Test rows: 6`,
        "The dataset is perfectly balanced at three sentences per emotion. The stratified split keeps two examples of every emotion in the test set, so the evaluation covers all six classes."
      ],
      [
        "Training a TF-IDF + Logistic Regression Pipeline",
        "To convert text into weighted features and train a classifier.",
        "TfidfVectorizer turns each sentence into a vector of word and bigram weights, giving rare but informative words more influence than common ones. Logistic regression then learns a decision boundary for each emotion. Keeping both steps in a Pipeline ensures the same transformation is applied at prediction time.",
        "Import the pipeline components|Create TF-IDF and logistic regression steps|Fit the pipeline on the training text|Predict the test set|Print accuracy and the classification report",
        `from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

model = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
    ("classifier", LogisticRegression(max_iter=1000))
])

model.fit(X_train, y_train)
predictions = model.predict(X_test)

print("Test Accuracy:", round(accuracy_score(y_test, predictions) * 100, 2), "%")
print("\\nClassification Report:")
print(classification_report(y_test, predictions, zero_division=0))`,
        `Test Accuracy: 33.33 %

Classification Report:
              precision    recall  f1-score   support

       anger       0.00      0.00      0.00         1
        fear       0.33      1.00      0.50         1
       happy       0.00      0.00      0.00         1
        love       1.00      1.00      1.00         1
     sadness       0.00      0.00      0.00         1
    surprise       0.00      0.00      0.00         1

    accuracy                           0.33         6
   macro avg       0.22      0.33      0.25         6
weighted avg       0.22      0.33      0.25         6`,
        "Only two of six test sentences are correct. With just two training examples per emotion the model cannot learn reliable boundaries, which is exactly why the classification report is more informative than a single accuracy figure."
      ],
      [
        "Predicting Emotions and Mapping Emoji",
        "To apply the trained model to new sentences and present the result visually.",
        "A prediction function wraps model.predict() and looks the result up in an emoji dictionary. Packaging the lookup separately keeps the model code clean and makes it easy to change how results are displayed.",
        "Define the emotion-to-emoji mapping|Write a detect_emotion function|Predict a happy sentence|Predict a lonely sentence|Predict a love sentence",
        `emoji_map = {
    "happy": "😊",
    "sadness": "😢",
    "anger": "😠",
    "fear": "😨",
    "love": "❤️",
    "surprise": "😲"
}

def detect_emotion(text):
    emotion = model.predict([text])[0]
    emoji = emoji_map[emotion]
    print("Input Text:", text)
    print("Detected Emotion:", emotion)
    print("Relevant Emoji:", emoji)
    print()

detect_emotion("I am happy to see you")
detect_emotion("I feel lonely today")
detect_emotion("I love my family")`,
        `Input Text: I am happy to see you
Detected Emotion: love
Relevant Emoji: ❤️

Input Text: I feel lonely today
Detected Emotion: sadness
Relevant Emoji: 😢

Input Text: I love my family
Detected Emotion: fear
Relevant Emoji: 😨`,
        "The lonely sentence is classified correctly, but the happy and love sentences are confused with other classes. The emoji mapping works as intended; the limiting factor is the tiny training set, so more labelled examples would be the first improvement."
      ]
    ]
  }

];

/* ---- The array used by the whole website ---- */
/* Every built-in experiment belongs to the default subject until an
   editor assigns it to another one (see js/data-store.js migration). */
experimentConfigs.forEach(function (c) { if (!c.subjectId) c.subjectId = SUBJECT_DEFAULT_ID; });
const experiments = experimentConfigs.map(buildExperiment);

/*=====================================================================/
   MODULES  (modules.html  ->  module.html?id=1)

   Copy one block to add Module 6 - the pages are data driven.
   Fields:
     id        module number
     title     module title
     summary   one line description (cards + hero)
     overview  paragraph shown on the module page
     topics    list of topics (numbered)
     concepts  [{ title, text }] important concepts
     images    [{ src, caption }] optional diagrams (assets/images/)
     notes     bullet points
     pdf       path to the study material (assets/pdfs/) or "" if none
     pdfName   suggested file name for the download
     resources [{ label, url, desc }] extra links
   ===================================================================== */
function buildModule(cfg) {
  return {
    id: Number(cfg.id),
    subjectId: cfg.subjectId || SUBJECT_DEFAULT_ID,
    title: cfg.title,
    summary: cfg.summary || "",
    overview: cfg.overview || "",
    topics: cfg.topics || [],
    concepts: cfg.concepts || [],
    images: cfg.images || [],
    notes: cfg.notes || [],
    pdf: cfg.pdf || "",
    pdfName: cfg.pdfName || "",
    resources: cfg.resources || [],
    materials: Array.isArray(cfg.materials) ? cfg.materials : []
  };
}

const moduleConfigs = [
  /* ------------------------------------------------------------ 1 */
  {
    id: 1,
    title: "Introduction to Data Science and Python Basics",
    summary: "What data science is, how a data project runs, and the Python essentials every experiment depends on.",
    overview:
      "This module introduces the data science lifecycle - collecting data, cleaning it, exploring it, modelling it and communicating the result. It then covers the Python programming essentials used in every laboratory experiment: variables, lists, dictionaries, loops, functions and working with files. By the end of the module you can write small, readable Python programs and explain where each step fits in a real data project.",
    topics: [
      "Introduction to data science and the data science lifecycle",
      "Roles, tools and applications of data science",
      "Installing Python 3 and Jupyter Notebook",
      "Variables, data types and operators",
      "Lists, tuples and dictionaries",
      "Conditional statements and loops",
      "Functions and modules",
      "Reading and writing simple files"
    ],
    concepts: [
      { title: "Data Science Lifecycle", text: "Collect → Clean → Explore → Model → Communicate. Every experiment in this lab follows some part of this flow." },
      { title: "Structured vs Unstructured", text: "Tables such as CSV files are structured; images, text and audio are unstructured and need different tools." },
      { title: "Functions", text: "A named block of code that can be reused. Well-named functions keep analysis code readable and testable." },
      { title: "Notebook", text: "Jupyter Notebook mixes code, output and explanation in one document - the usual workspace of a data scientist." }
    ],
    images: [],
    notes: [
      "Python lists are ordered and can hold mixed types; NumPy arrays are faster because every element has the same numeric type.",
      "Use f-strings such as f\"Average: {value:.2f}\" to format numbers inside print statements.",
      "Always pin random seeds (random.seed or np.random.seed) so results can be reproduced.",
      "Keep raw data files unchanged; write cleaned data to a new file."
    ],
    pdf: "assets/pdfs/module-1.pdf",
    pdfName: "Module 1 - Study Material.pdf",
    resources: [
      { label: "Python Tutorial", url: "https://docs.python.org/3/tutorial/", desc: "Official Python language tutorial" },
      { label: "Jupyter Notebook", url: "https://jupyter.org/try-jupyter/lab/", desc: "Run notebooks directly in the browser" },
      { label: "Python Cheat Sheet", url: "https://www.pythoncheatsheet.org/", desc: "Quick reference for syntax and collections" }
    ]
  },

  /* ------------------------------------------------------------ 2 */
  {
    id: 2,
    title: "Numerical Computing with NumPy",
    summary: "Arrays, vectorised operations, statistics, linear algebra and random simulation with NumPy.",
    overview:
      "NumPy provides the n-dimensional array, the data structure behind nearly every Python data library. This module covers creating arrays, inspecting shape and dtype, indexing and slicing, boolean masking, broadcasting and vectorised operations instead of loops. It finishes with descriptive statistics, solving linear systems and reproducible random simulation.",
    topics: [
      "Creating arrays: array, arange, zeros, ones, eye and linspace",
      "Shape, size, dtype and array attributes",
      "Indexing, slicing and boolean masking",
      "Broadcasting and vectorised arithmetic",
      "Statistical functions: mean, median, var, std, min, max",
      "Sorting, unique values and axis-wise operations",
      "Linear algebra: multiplication, determinant, inverse, solving Ax = b",
      "Random number generation and simulation"
    ],
    concepts: [
      { title: "Vectorisation", text: "Apply one operation to the whole array instead of writing a Python loop - shorter and much faster." },
      { title: "Broadcasting", text: "NumPy stretches smaller arrays so that arrays of compatible shapes can be combined without copying data." },
      { title: "Boolean Mask", text: "A True/False array used to select only the elements that satisfy a condition, e.g. marks[marks > 80]." },
      { title: "Axis", text: "Axis 0 is rows and axis 1 is columns in 2-D; statistics collapse the axis they run along." }
    ],
    images: [],
    notes: [
      "Array operations are element-wise: a * b multiplies corresponding items, while a @ b performs matrix multiplication.",
      "Slices are views, not copies - use .copy() when an independent array is needed.",
      "np.linalg.solve is preferred over computing an inverse manually.",
      "np.random.seed(42) makes dice rolls and samples repeatable across runs."
    ],
    pdf: "assets/pdfs/module-2.pdf",
    pdfName: "Module 2 - Study Material.pdf",
    resources: [
      { label: "NumPy User Guide", url: "https://numpy.org/doc/stable/user/index.html", desc: "Official NumPy documentation" },
      { label: "NumPy Cheat Sheet", url: "https://numpy.org/doc/stable/user/quickstart.html", desc: "Quick start and reference" },
      { label: "From Lists to Arrays", url: "https://numpy.org/doc/stable/reference/generated/numpy.array.html", desc: "np.array explained" }
    ]
  },

  /* ------------------------------------------------------------ 3 */
  {
    id: 3,
    title: "Data Manipulation with Pandas",
    summary: "DataFrames, selection, filtering, grouping, merging and reshaping tabular data with Pandas.",
    overview:
      "Pandas is the standard tool for tabular data in Python. This module covers Series and DataFrame creation, reading CSV files, selecting with loc and iloc, filtering and sorting, handling missing values, group-by aggregation, merging tables and building pivot tables. These are the day-to-day operations of a data analyst.",
    topics: [
      "Series and DataFrame fundamentals",
      "Reading CSV and Excel files with read_csv / read_excel",
      "Inspecting data: head, describe, info, shape, dtypes",
      "Selection with loc and iloc",
      "Filtering, sorting and conditional queries",
      "Missing values: isnull, fillna, dropna",
      "GroupBy: split, apply, combine and aggregation",
      "Merge, join and pivot tables"
    ],
    concepts: [
      { title: "DataFrame", text: "A labelled table of rows and columns with a default integer index - a spreadsheet inside Python." },
      { title: "loc vs iloc", text: "loc selects by label (inclusive), iloc selects by integer position (exclusive at the end)." },
      { title: "Split-Apply-Combine", text: "Group rows by a key, apply an aggregate such as mean, and combine the answers into a new table." },
      { title: "Merge", text: "Join two tables on a shared key column, like a SQL JOIN." }
    ],
    images: [],
    notes: [
      "Combine several conditions with & and |, and wrap each condition in brackets: df[(a) & (b)].",
      "The median is safer than the mean for filling missing numeric values when outliers exist.",
      "groupby(...)[\"Marks\"].agg([\"mean\", \"max\", \"count\"]) gives a compact summary table.",
      "Always check df.shape before and after merging or dropping rows."
    ],
    pdf: "assets/pdfs/module-3.pdf",
    pdfName: "Module 3 - Study Material.pdf",
    resources: [
      { label: "Pandas User Guide", url: "https://pandas.pydata.org/docs/user_guide/index.html", desc: "Official pandas documentation" },
      { label: "10 Minutes to Pandas", url: "https://pandas.pydata.org/docs/user_guide/10min.html", desc: "Fast introduction" },
      { label: "Pandas Cheat Sheet", url: "https://pandas.pydata.org/Pandas_Cheat_Sheet.pdf", desc: "One-page reference (PDF)" }
    ]
  },

  /* ------------------------------------------------------------ 4 */
  {
    id: 4,
    title: "Data Visualization with Matplotlib and Seaborn",
    summary: "Choosing and drawing the right chart: line, bar, histogram, scatter, box plot and heatmap.",
    overview:
      "Charts reveal patterns that tables hide. This module explains when each chart type is appropriate and how to draw and label it properly with Matplotlib and Seaborn. You will create line, bar, histogram, scatter, box and heatmap charts, style them with titles, axes and legends, and combine them into a multi-panel dashboard figure.",
    topics: [
      "The matplotlib object model: figure and axes",
      "Line plots for trends and bar charts for comparison",
      "Histograms and density curves for distributions",
      "Scatter plots for relationships between variables",
      "Box plots for spread and outliers",
      "Correlation heatmaps with Seaborn",
      "Titles, axis labels, legends and colour maps",
      "Subplots and multi-panel dashboards"
    ],
    concepts: [
      { title: "Choose by Question", text: "Trend → line, comparison → bar, distribution → histogram/box, relationship → scatter, correlation → heatmap." },
      { title: "Figure vs Axes", text: "The figure is the whole window; each axes is one plot inside it. subplots() creates grids of axes." },
      { title: "KDE", text: "A kernel density curve smooths the histogram outline to show the shape of the distribution." },
      { title: "Colour Map", text: "Sequential maps show magnitude, diverging maps show deviation from a centre such as 0." }
    ],
    images: [],
    notes: [
      "Start bar charts at zero so bar lengths are not exaggerated.",
      "Set the random sample or bin count deliberately - bin width changes the story a histogram tells.",
      "seaborn accepts a DataFrame directly through data=, and hue= adds a colour dimension.",
      "Use fig.tight_layout() (or subplots_adjust) to stop labels overlapping."
    ],
    pdf: "assets/pdfs/module-4.pdf",
    pdfName: "Module 4 - Study Material.pdf",
    resources: [
      { label: "Matplotlib Tutorials", url: "https://matplotlib.org/stable/tutorials/index.html", desc: "Official plotting tutorials" },
      { label: "Seaborn Tutorial", url: "https://seaborn.pydata.org/tutorial.html", desc: "Statistical visualisation guide" },
      { label: "Chart Chooser", url: "https://www.data-to-viz.com/", desc: "Pick the right chart for your question" }
    ]
  },

  /* ------------------------------------------------------------ 5 */
  {
    id: 5,
    title: "Statistics and Machine Learning Fundamentals",
    summary: "Descriptive statistics, correlation, train/test split, regression, classification, clustering and evaluation.",
    overview:
      "This module connects statistics with machine learning. It covers descriptive statistics and correlation, then the beginner machine learning workflow in scikit-learn: splitting data, training regression and classification models, clustering unlabelled data with K-means and evaluating models with accuracy, a confusion matrix and precision/recall/F1. Overfitting, leakage and the difference between supervised and unsupervised learning are discussed throughout.",
    topics: [
      "Descriptive statistics: mean, median, variance, standard deviation",
      "Correlation and correlation versus causation",
      "Supervised vs unsupervised learning",
      "Train/test split and why unseen data matters",
      "Linear and logistic regression",
      "K-nearest neighbours and decision trees",
      "K-means clustering",
      "Evaluation: accuracy, confusion matrix, precision, recall, F1"
    ],
    concepts: [
      { title: "Overfitting", text: "A model that memorises training data scores well there but fails on new data. Simpler models and held-out test data expose it." },
      { title: "Train/Test Split", text: "Hold back a fraction of the data (commonly 20%) that the model never sees during training." },
      { title: "Confusion Matrix", text: "A table of predicted vs actual classes showing exactly which classes the model confuses." },
      { title: "Feature Scaling", text: "Normalisation (0-1) and standardisation (mean 0, sd 1) stop large-valued features dominating distance-based models." }
    ],
    images: [],
    notes: [
      "Scale features before KNN or SVM; tree-based models do not require scaling.",
      "Use stratify=y when splitting classification data so every class keeps its share.",
      "Accuracy is misleading on imbalanced data - check precision and recall as well.",
      "Fix random_state to make splits and models repeatable."
    ],
    pdf: "assets/pdfs/module-5.pdf",
    pdfName: "Module 5 - Study Material.pdf",
    resources: [
      { label: "Scikit-learn Guide", url: "https://scikit-learn.org/stable/user_guide.html", desc: "Official machine learning guide" },
      { label: "Statistics Review", url: "https://stattrek.com/", desc: "Probability and statistics reference" },
      { label: "ML Glossary", url: "https://developers.google.com/machine-learning/glossary", desc: "Plain-language ML terms" }
    ]
  }
];

/* ---- The array used by the modules pages ---- */
moduleConfigs.forEach(function (c) { if (!c.subjectId) c.subjectId = SUBJECT_DEFAULT_ID; });
const modules = moduleConfigs.map(buildModule);
