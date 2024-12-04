import fetch from 'node-fetch';
import xlsx from 'xlsx';

// Function to fetch students' data for each alphabet
const fetchStudentsByLetter = async (letter) => {
  try {
    const response = await fetch('https://spectraserver-indol.vercel.app/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchInput: letter, // Searching for each alphabet letter A to Z
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(Error fetching data for ${letter}:, error);
    return [];
  }
};

// Function to fetch all students for letters A to Z
const fetchAllStudents = async () => {
  const allStudents = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (const letter of alphabet) {
    const students = await fetchStudentsByLetter(letter);
    allStudents.push(...students);
  }

  return allStudents;
};

// Function to remove duplicates based on rollno
const removeDuplicates = (students) => {
  const uniqueStudents = [];
  const seenRollNos = new Set();

  students.forEach((student) => {
    if (!seenRollNos.has(student.rollno)) {
      uniqueStudents.push(student);
      seenRollNos.add(student.rollno);
    }
  });

  return uniqueStudents;
};

// Function to truncate long fields to avoid Excel limit
const safelyTruncateField = (field, maxLength = 32767) => {
  if (typeof field === 'string' && field.length > maxLength) {
    return field.substring(0, maxLength - 3) + '...'; // Truncate and add '...'
  }
  return field;
};

// Function to group students by their current year
const groupStudentsByYear = (students) => {
  return students.reduce((acc, student) => {
    const year = student.currentyear || 'Unknown';
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push({
      id: student.id,
      _id: safelyTruncateField(student._id),
      psflag: student.psflag,
      firstname: safelyTruncateField(student.firstname),
      lastname: safelyTruncateField(student.lastname),
      rollno: student.rollno,
      section: safelyTruncateField(student.section),
      dept: safelyTruncateField(student.dept),
      phone: student.phone,
      picture: safelyTruncateField(student.picture),  // Handling long picture URLs
      yearofadmision: safelyTruncateField(student.yearofadmision),
      parentphone: student.parentphone,
      currentyear: student.currentyear,
      newlogin: student.newlogin,
      snewlogin: student.snewlogin,
      hallticketno: safelyTruncateField(student.hallticketno),
      email: safelyTruncateField(student.email?.join(', ') || ''), // Joining email array
    });
    return acc;
  }, {});
};

// Function to export data to an Excel file
const exportToExcel = (groupedData) => {
    const workbook = xlsx.utils.book_new();
  
    for (const year in groupedData) {
      const worksheetData = groupedData[year].map((student) => ({
        ID: student.id,
        _id: student._id,
        PsFlag: student.psflag,
        Firstname: student.firstname,
        Lastname: student.lastname,
        RollNo: student.rollno,
        Section: student.section,
        Dept: student.dept,
        Phone: student.phone,
        Picture: student.picture,
        YearOfAdmission: student.yearofadmision,
        ParentPhone: student.parentphone,
        CurrentYear: student.currentyear,
        NewLogin: student.newlogin,
        SNewLogin: student.snewlogin,
        HallTicketNo: student.hallticketno,
        Email: student.email,
      }));
  
      const worksheet = xlsx.utils.json_to_sheet(worksheetData);
      xlsx.utils.book_append_sheet(workbook, worksheet, Year_${year});
    }
  
    // Change the filename to something new to avoid file lock issues
    const outputFileName = students_by_year_${Date.now()}.xlsx;
    xlsx.writeFile(workbook, outputFileName);
    console.log(Data exported to ${outputFileName});
  };
  

// Main function to fetch, process, and export data
const main = async () => {
  // Step 1: Fetch all students from A to Z
  let allStudents = await fetchAllStudents();

  // Step 2: Remove duplicates
  allStudents = removeDuplicates(allStudents);

  // Step 3: Group students by year
  const groupedData = groupStudentsByYear(allStudents);

  // Step 4: Export grouped data to Excel
  exportToExcel(groupedData);
};

// Run the main function
main();