/*
 * MIT License
 * Copyright (c) 2017 The FreeBSD Foundation
 * Refer to LICENSE
*/

// utility functions

function getJSON(path, callback) {
  var xmlhttp = new XMLHttpRequest();
  // var url = "origin" + path;

  xmlhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      var data = JSON.parse(this.responseText);
      callback(data);
    }
  };

  xmlhttp.open("GET", url, true);
  // xmlhttp.setRequestHeader("Authorization", "Basic " + btoa("username:password"));
  xmlhttp.send();
}

function unique(arr) {
  var hash = {}, result = [];
  for (var i = 0, l = arr.length; i < l; ++i) {
    var item = arr[i];
    if (!hash.hasOwnProperty(item)) {
      hash[item] = true;
      result.push(item);
    }
  }
  return result;
}

function twoDigits(n) {
  return (n > 9) ? ""+n : "0"+n;
}

// splitName must be of the format ['head'] or [TYPE, NUMBER]
function getVersionOrder(splitName) {
  return (splitName.length === 1) ? Number.MAX_SAFE_INTEGER : parseInt(splitName[1]);
}

// HTML generation functions

var _table_ = document.createElement('table');
var _tr_    = document.createElement('tr');
var _th_    = document.createElement('th');
var _td_    = document.createElement('td');
var _br_    = document.createElement('br');
var _span_  = document.createElement('span');

// generates a formatted cell, with two designs based
// on whether the build succeeded or failed
function generateFormattedCell(job) {
  var td = _td_.cloneNode(false);

  if (job && job.lastCompletedBuild) {
    // last build time and status
    var info = _span_.cloneNode(false);
    info.setAttribute('class', job.lastCompletedBuild.result.toLowerCase());
    var lastCompletedBuildDate = new Date(job.lastCompletedBuild.timestamp);
    info.appendChild(document.createTextNode([
      lastCompletedBuildDate.getUTCFullYear(),
      twoDigits(lastCompletedBuildDate.getUTCMonth() + 1),
      twoDigits(lastCompletedBuildDate.getUTCDate())
    ].join('-')));
    info.appendChild(_br_.cloneNode(false));
    info.appendChild(document.createTextNode(
      twoDigits(lastCompletedBuildDate.getUTCHours()) + ':' +
      twoDigits(lastCompletedBuildDate.getUTCMinutes()) + ' UTC'
    ));
    td.appendChild(info);
    td.appendChild(_br_.cloneNode(false));

    // SVN revision number
    var revision = document.createElement('i');
    revision.appendChild(document.createTextNode(job.lastCompletedBuild.description || 'unknown revision'));
    td.appendChild(revision);
    td.appendChild(_br_.cloneNode(false));
    if (job.lastCompletedBuild.result !== 'SUCCESS') {
      var failingSince = document.createElement('i');
      failingSince.appendChild(document.createTextNode(
        '(failing since ' + (job.lastSuccessfulBuild.description || '?') + ')'
      ));
      td.appendChild(failingSince);
      td.appendChild(_br_.cloneNode(false));
    }

    // link to full jenkins job detail
    var links = _span_.cloneNode(false);
    links.setAttribute('class', 'tiny');
    if (job.lastCompletedBuild.result !== 'SUCCESS') {
      var lastSuccessful = document.createElement('a');
      lastSuccessful.setAttribute('href', job.lastSuccessfulBuild.url);
      lastSuccessful.appendChild(document.createTextNode('last successful build'));
      links.appendChild(lastSuccessful);
      links.appendChild(document.createTextNode(' | '));
    }
    var href = document.createElement('a');
    href.setAttribute('href', job.lastCompletedBuild.url);
    href.appendChild(document.createTextNode('details'));
    links.appendChild(href);
    td.appendChild(links);
  } else {
    td.appendChild(document.createTextNode('N/A'));
  }

  return td;
}

function generateTable(tableData) {
  var table = _table_.cloneNode(false);
  var rows = Object.values(tableData);

  // generating column headers
  var thead = document.createElement('thead');
  var columnHeaders = _tr_.cloneNode(false);
  columnHeaders.appendChild(_th_.cloneNode(false));
  var columnNames = unique([].concat.apply([], rows.map(Object.keys))).sort(function(a, b) {
    return a[1]._order < b[1]._order;
  });
  // TODO: make this cleaner, getting rid of the "order" field
  columnNames.splice(columnNames.indexOf('_order'), 1);
  columnNames.forEach(function(c) {
    var th = _th_.cloneNode(false);
    th.setAttribute('scope', 'col');
    th.appendChild(document.createTextNode(c));
    columnHeaders.appendChild(th);
  });
  thead.appendChild(columnHeaders);
  table.appendChild(thead);

  // generating rows, ordered in decending order
  // starting with latest build version
  var tbody = document.createElement('tbody');
  Object.entries(tableData).forEach(function(entry) {
    var tr = _tr_.cloneNode(false);

    var th = _th_.cloneNode(false);
    th.setAttribute('scope', 'row');
    th.appendChild(document.createTextNode(entry[0]));
    tr.appendChild(th);

    // ensuring that the columns are processed in the same order as the
    // column headers
    columnNames.forEach(function(columnName) {
      var job = entry[1][columnName];
      tr.appendChild(generateFormattedCell(job));
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  document.body.appendChild(table);
}

getJSON('/jenkins/api/json?tree=jobs[name,lastCompletedBuild[result,timestamp,url,description],lastSuccessfulBuild[result,timestamp,url,description]]', function(data) {
  var tableData = {};
  data.jobs.forEach(function(job) {
    // e.g. 1. FreeBSD-stable-10-amd64-build
    // e.g. 2. FreeBSD-head-amd64-build
    var splitName = job.name.split('-');
    if (splitName.shift() === 'FreeBSD' && splitName.pop() === 'build') {
      // splitName contains version-[number-]arch
      var arch = splitName.pop();
      var version = splitName.join('/');
      if (!tableData[arch]) {
        tableData[arch] = {_order: getVersionOrder(splitName)};
      }
      tableData[arch][version] = job;
    }
  });

  generateTable(tableData);
  document.body.appendChild(document.createTextNode("Last updated: " + new Date()));
});
