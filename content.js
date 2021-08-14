async function process() {
  console.log("Downloading ranking ...");
  const rankingData = await getRanking();

  console.log("Computing ...");
  const tables = document.querySelectorAll("tbody");
  for (var i = 0; i < tables.length; i++) {
    const table = tables[i];
    processTable(i, table, rankingData);
  }
  console.log("Done ...");
}

function processTable(index, table, rankingData) {
  const rows = table.querySelectorAll("tr");

  var tableRanking = [];
  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const attributes = row.querySelectorAll("td");
    const regNumber = replaceNonAscii(attributes[0].textContent);
    const name = replaceNonAscii(attributes[1].textContent);

    const athleteRanking = getAthleteRanking(rankingData, name, regNumber);
    if (athleteRanking !== null) {
      tableRanking.push(athleteRanking);
    }

    // attributes[1].textContent = athleteRanking
    //   ? `${name} (${athleteRanking})`
    //   : name;
  }

  const rvpCount = 4;

  // sort by ranking
  tableRanking.sort((a, b) => b.ranking - a.ranking);

  // set rvp makers
  tableRanking.slice(0, rvpCount).forEach((item) => (item.rvp = true));

  // compute rvp
  const rvp = Math.round(
    tableRanking.slice(0, rvpCount).reduce((a, b) => a + b.ranking, 0) /
      Math.min(rvpCount, tableRanking.length)
  );

  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const attributes = row.querySelectorAll("td");
    const regNumber = replaceNonAscii(attributes[0].textContent);
    const name = replaceNonAscii(attributes[1].textContent);

    const athleteRanking = getAthleteRanking(rankingData, name, regNumber);
    if (athleteRanking) {
      attributes[1].style.display = "flex";
      attributes[1].style.flexDirection = "row";
      attributes[1].style.alignItems = "center";
      attributes[1].style.justifyContent = "space-between";

      const rvpSpan = document.createElement("span");
      rvpSpan.innerHTML = `(${athleteRanking.ranking})`;
      attributes[1].appendChild(rvpSpan);
      if (athleteRanking.rvp === true) {
        rvpSpan.style.color = "green";
      }
    }
  }

  if (tableRanking.length > 0) {
    const rvpElement = document.querySelectorAll(`div.row.mt-3 h3`)[index];
    const rvpSpan = document.createElement("span");
    rvpSpan.innerHTML = `(${rvp})`;
    rvpElement.appendChild(rvpSpan);
  }
}

function getAthleteRanking(rankingData, name, regNumber) {
  for (var i = 0; i < rankingData.length; i++) {
    const temp = rankingData[i];
    if (temp.name === name && temp.regNumber === regNumber) return temp;
  }
  return null;
}

async function getRanking() {
  const data1 = await fetchRanking("M").then((data) =>
    parseCSVToArray(data, ";")
  );
  const data2 = await fetchRanking("F").then((data) =>
    parseCSVToArray(data, ";")
  );
  data1.concat(data2);
  const result = [];
  for (var i = 0; i < data1.length; i++) {
    const temp = data1[i];
    result.push({
      name: `${temp[1]} ${temp[2]}`,
      regNumber: temp[3],
      ranking: parseInt(temp[5]),
    });
  }
  return result;
}

async function fetchRanking(gender) {
  const response = await fetch(
    `https://oris.orientacnisporty.cz/ranking_export?date=2222-12-12&sport=1&gender=${gender}&csv=1`,
    {
      method: "GET",
      headers: {
        Accept: "application/json, application/xml, text/plain, text/html, *.*",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
    }
  );
  return await response.text();
}

function parseCSVToArray(strData, strDelimiter) {
  // Check to see if the delimiter is defined. If not,
  // then default to comma.
  strDelimiter = strDelimiter || ",";

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    // Delimiters.
    "(\\" +
      strDelimiter +
      "|\\r?\\n|\\r|^)" +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      strDelimiter +
      "\\r\\n]*))",
    "gi"
  );

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while ((arrMatches = objPattern.exec(strData))) {
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      // Since we have reached a new row of data,
      // add an empty row to our data array.
      arrData.push([]);
    }

    var strMatchedValue;

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {
      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      strMatchedValue = arrMatches[2].replace(new RegExp('""', "g"), '"');
    } else {
      // We found a non-quoted value.
      strMatchedValue = arrMatches[3];
    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  // Return the parsed data.
  return arrData;
}

function replaceNonAscii(text) {
  return text.replace(/  |\r\n|\n|\r/gm, "");
}

process();
