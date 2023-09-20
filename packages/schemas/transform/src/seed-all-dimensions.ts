
const currentYear = new Date().getFullYear();
    const yearsInPast = 3;
    const yearsInFuture = 3;
    const pastStartYear = currentYear - yearsInPast;
    const futureEndYear = currentYear + yearsInFuture;

    let weekNumber = 1; 
    let yearSeed = 0; 
    let dayOfWeek = 0; 

    for (let year = pastStartYear; year <= futureEndYear; year++) {
      if (year !== yearSeed) {
        weekNumber = 1;
        yearSeed = year;
      }

      for (let month = 1; month <= 12; month++) {
        let daysInMonth = 31; 

        if (month === 4 || month === 6 || month === 9 || month === 11) {
          daysInMonth = 30;
        } else if (month === 2) {
          daysInMonth = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
        }

        for (let day = 1; day <= daysInMonth; day++) {
          console.log(weekNumber)


          if (dayOfWeek === 6) {
            weekNumber++;
          }

          dayOfWeek = (dayOfWeek + 1) % 7;
        }
      }
    }


