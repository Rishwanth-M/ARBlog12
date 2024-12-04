const loginButton = document.getElementById("loginButton");
const mobileNumberInput = document.getElementById("mobileNumber");
const messagesContainer = document.getElementById("messages");
const attendanceTable = document.querySelector("#attendanceTable tbody");
const attendanceChartContainer = document.getElementById("attendanceChartContainer");
const totalPercentageElement = document.getElementById("totalPercentage");

loginButton.addEventListener("click", handleLogin);

let loading = false;

async function handleLogin() {
  const mobileNumber = mobileNumberInput.value;
  if (!/^\d{10}$/.test(mobileNumber)) {
    displayMessage("Please enter a valid 10-digit mobile number.", "error");
    return;
  }

  setLoading(true);
  clearMessages();

  try {
    const response = await axios.post("http://localhost:5000/login", { mobilenumber: mobileNumber });
    if (response.data.token) {
      const token = response.data.token;
      localStorage.setItem("authToken", token);
      displayMessage("Login successful! Token generated.", "success");
      fetchData(token);
    } else {
      displayMessage("Login failed. Please check your mobile number and try again.", "error");
    }
  } catch (err) {
    displayMessage("Failed to login. Please check your connection or try again later.", "error");
  } finally {
    setLoading(false);
  }
}

async function fetchData(token) {
  setLoading(true);
  clearMessages();

  try {
    const response = await axios.post(
      "http://localhost:5000/data314",
      { method: "314" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      const data = response.data.data;
      renderAttendanceData(data.attandance.dayobjects);
      renderAttendanceChart(data.overallattperformance);
      displayMessage("Data fetched successfully!", "success");
    } else {
      displayMessage("Failed to fetch data. The server returned an error.", "error");
    }
  } catch (err) {
    displayMessage("Failed to fetch data. Please check your connection or try again later.", "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  loading = isLoading;
  loginButton.disabled = isLoading;
  loginButton.textContent = isLoading ? "Loading..." : "Login & Fetch Data";
}

function displayMessage(message, type) {
  const messageElement = document.createElement("div");
  messageElement.classList.add(type);
  messageElement.textContent = message;
  messagesContainer.appendChild(messageElement);
}

function clearMessages() {
  messagesContainer.innerHTML = "";
}

function renderAttendanceData(dayObjects) {
  attendanceTable.innerHTML = "";
  dayObjects.forEach((day) => {
    const row = document.createElement("tr");
    const dateCell = document.createElement("td");
    const sessionsCell = document.createElement("td");
    dateCell.textContent = day.date;
    sessionsCell.textContent = formatSessions(day.sessions);
    row.appendChild(dateCell);
    row.appendChild(sessionsCell);
    attendanceTable.appendChild(row);
  });
}

function renderAttendanceChart(overallPerformance) {
  const totalPercentage = overallPerformance.totalpercentage || 0;
  const presentPercentage = totalPercentage;
  const absentPercentage = 100 - presentPercentage;

  const data = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        label: "Attendance",
        data: [presentPercentage, absentPercentage],
        backgroundColor: ["#4caf50", "#f44336"],
        hoverOffset: 4,
      },
    ],
  };

  const ctx = document.getElementById("attendanceChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: data,
  });

  totalPercentageElement.textContent = `Total Attendance Percentage: ${totalPercentage}%`;
}

function formatSessions(sessions) {
  const sessionLabels = ["session1", "session2", "session3", "session4", "session5", "session6", "session7"];
  return sessionLabels
    .map((session) => {
      const value = sessions[session];
      if (value === "0") return "❌";  // Absent
      if (value === "1") return "✅";  // Present
      if (value === "2") return "⭕";  // No Session
      return "❓";  // Unknown value
    })
    .join(" ");
}
