/*
 * MIT License
 * Copyright (c) 2017 The FreeBSD Foundation
 * Refer to LICENSE
*/


// global options

var RUN_ENV = 'local' // one of ['local', 'stage', 'prod']


// configurations

var JENKINS_URL = 'https://ci.freebsd.org';
var PAYLOAD_URL = '/view/FreeBSD/api/json?tree=jobs[name,lastCompletedBuild[result,timestamp,url,description],lastSuccessfulBuild[result,timestamp,url,description]]';

if (RUN_ENV === 'local') {
  JENKINS_URL = 'http://localhost:8000';
} else if (RUN_ENV === 'stage') {
  JENKINS_URL = 'https://people.freebsd.org/~ygy/tinderbox';
  PAYLOAD_URL = '/example.json';
}


// utility functions

function getJSON(path, callback) {
  var xmlhttp = new XMLHttpRequest();
  var url = JENKINS_URL + path;

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
        '(failing since ' + (job.lastSuccessfulBuild ? (job.lastSuccessfulBuild.description || 'n/a') : 'n/a') + ')'
      ));
      td.appendChild(failingSince);
      td.appendChild(_br_.cloneNode(false));
    }

    // link to full jenkins job detail
    var links = _span_.cloneNode(false);
    links.setAttribute('class', 'tiny');
    if (job.lastCompletedBuild.result !== 'SUCCESS') {
      var lastSuccessful = document.createElement('a');
      lastSuccessful.setAttribute('href', job.lastSuccessfulBuild ? job.lastSuccessfulBuild.url : '#');
      lastSuccessful.appendChild(document.createTextNode('last successful build'));
      links.appendChild(lastSuccessful);
      links.appendChild(document.createTextNode(' | '));
    }
    var href = document.createElement('a');
    href.setAttribute('href', job.lastCompletedBuild.url);
    href.appendChild(document.createTextNode('details'));
    links.appendChild(href);
    td.appendChild(links);
    td.appendChild(_br_.cloneNode(false));

    // add test result when available
    if (job.testResult) {
      var testResult = _span_.cloneNode(false);
      testResult.setAttribute('class', 'tiny ' + job.testResult.lastCompletedBuild.result.toLowerCase());
      var testBuildLink = _span_.cloneNode(false);
      var testA = document.createElement('a');
      testA.setAttribute('href', job.testResult.lastCompletedBuild.url);
      testA.appendChild(document.createTextNode('Test suite'));
      testBuildLink.appendChild(testA);
      testResult.appendChild(testBuildLink);
      testResult.appendChild(document.createTextNode(' '));
      testResult.appendChild(document.createTextNode(job.testResult.lastCompletedBuild.result));
      td.appendChild(testResult);
      td.appendChild(_br_.cloneNode(false));
    }
  } else {
    td.appendChild(document.createTextNode('-'));
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

getJSON(PAYLOAD_URL, function(data) {
  var testData = {};
  var tableData = {};

  // -test
  data.jobs.forEach(function(job) {
    // e.g. 1. FreeBSD-stable-11-aarch64-test
    // e.g. 2. FreeBSD-head-aarch64-test
    var splitName = job.name.split('-');
    if (splitName.shift() === 'FreeBSD' && splitName.pop() === 'test') {
      // splitName contains version-[number-]arch
      var arch = splitName.pop();
      var version = splitName.join('/');
      if (!testData[arch]) {
        testData[arch] = {_order: getVersionOrder(splitName)};
      }
      testData[arch][version] = job;
    }
  });

  // -build
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
      if (testData[arch] && testData[arch][version]) {
        job['testResult'] = testData[arch][version];
      }
      tableData[arch][version] = job;
    }
  });

  if (RUN_ENV === 'local' || RUN_ENV === 'stage') {
    document.body.appendChild(document.createTextNode("You are viewing a static (preview) version of the site on " + RUN_ENV +'.'));
  }
  generateTable(tableData);
  document.body.appendChild(document.createTextNode("Last updated: " + new Date()));
});
