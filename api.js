import fetch from 'node-fetch';

const checkHallTicketNumber = async (hallTicketNo) => {
  try {
    const response = await fetch('https://spectraserver-indol.vercel.app/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchInput: hallTicketNo, // Send hall ticket number to the API
      }),
    });

    const text = await response.text();
    console.log(`Response for Hall Ticket Number ${hallTicketNo}:`, text);
    const data = JSON.parse(text);
    
    if (data.length > 0) {
      // If the hall ticket number exists in the response
      return true;
    } else {
      // If the hall ticket number doesn't exist in the response
      return false;
    }
  } catch (error) {
    console.error(`Error checking Hall Ticket Number ${hallTicketNo}:`, error);
    return false;
  }
};

export { checkHallTicketNumber };
