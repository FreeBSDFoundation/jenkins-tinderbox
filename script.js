/*
 * MIT License
 * Copyright (c) 2017, 2021 The FreeBSD Foundation
 * Refer to LICENSE
*/

// utility functions

function getJSON(path, callback) {
  var xmlhttp = new XMLHttpRequest();
  var url = "https://ci.FreeBSD.org" + path;

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

function shortHash(hash) {
  return hash ? hash.substring(0, 12) : '';
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

    // Git hash
    var commit = document.createElement('i');
    commit.appendChild(document.createTextNode(shortHash(job.lastCompletedBuild.description) || 'unknown commit'));
    td.appendChild(commit);
    td.appendChild(_br_.cloneNode(false));

    // link to full jenkins job detail
    var links = _span_.cloneNode(false);
    links.setAttribute('class', 'tiny');
    var href = document.createElement('a');
    href.setAttribute('href', job.lastCompletedBuild.url);
    href.appendChild(document.createTextNode('details'));
    links.appendChild(href);
    td.appendChild(links);
    td.appendChild(_br_.cloneNode(false));

    // check if the last completed build result is not 'SUCCESS'
    if (job.lastCompletedBuild.result !== 'SUCCESS') {
      var fail_url = '', failingSinceNumber = '1', fail_since_hash = 'n/a';
      if (job.lastCompletedBuild.result === 'FAILURE')
        failingSinceNumber = (job.lastSuccessfulBuild ? job.lastSuccessfulBuild.number + 1: '1').toString();
      else if (job.lastCompletedBuild.result === 'UNSTABLE')
        failingSinceNumber = (Math.max(job.lastStableBuild ? job.lastStableBuild.number : 0, job.lastFailedBuild ? job.lastFailedBuild.number : 0) + 1).toString();
      fail_url = '/job/' + job.name + '/' + failingSinceNumber + '/api/json?tree=description';
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "https://ci.FreeBSD.org" + fail_url, false);
      xhr.send();
      if (xhr.status === 200)
        fail_since_hash = JSON.parse(xhr.responseText).description;
      else
        throw new Error("Failed to fetch data from " + fail_url + ". Status: " + xhr.status);

      var failingSince = document.createElement('i');
      failingSince.appendChild(document.createTextNode(
        '(failing since ' + (fail_since_hash === '<html>' ? 'unknown commit' : shortHash(fail_since_hash)) + ')'
      ));
      td.appendChild(failingSince);
      td.appendChild(_br_.cloneNode(false));
      var links = _span_.cloneNode(false);
      links.setAttribute('class', 'tiny');
      var lastSuccessful = document.createElement('a');
      lastSuccessful.setAttribute('href', 'https://ci.FreeBSD.org' + fail_url.split('api')[0]);
      lastSuccessful.appendChild(document.createTextNode('details'));
      links.appendChild(lastSuccessful);
      td.appendChild(links);
    }
  } else {
    td.appendChild(document.createTextNode('-'));
  }

  return td;
}

const customOrder = 'abcdefghijklmnopqrstuvwxyz9876543210';

function customSort(str1, str2) {
  const minLength = Math.min(str1.length, str2.length);

  for (let i = 0; i < minLength; i++) {
    const char1 = str1.charAt(i);
    const char2 = str2.charAt(i);

    if (char1 !== char2) {
      return customOrder.indexOf(char1) - customOrder.indexOf(char2);
    }
  }

  return str1.length - str2.length; // If all characters are equal, shorter strings come first
}

function generateTable(tableData) {
  var table = _table_.cloneNode(false);
  var rows = Object.values(tableData);

  // generating column headers
  var thead = document.createElement('thead');
  var columnHeaders = _tr_.cloneNode(false);
  columnHeaders.appendChild(_th_.cloneNode(false));
  var columnNames = unique([].concat.apply([], rows.map(Object.keys))).sort(function(a, b) {
    return getVersionOrder(a.split('/')) < getVersionOrder(b.split('/'));
  });
  columnNames.sort(customSort);
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

getJSON('/view/FreeBSD/api/json?tree=jobs[name,lastCompletedBuild[number,result,timestamp,url,description],lastSuccessfulBuild[number,result,timestamp,url,description],lastFailedBuild[number],lastStableBuild[number]]', function(data) {
  var tableData = {};
  data.jobs.forEach(function(job) {
    // e.g. 1. FreeBSD-stable-10-amd64-build
    // e.g. 2. FreeBSD-head-amd64-build
    var splitName = job.name.split('-');
    if (splitName.shift() === 'FreeBSD' && (splitName.slice(-1)[0] === 'build' || splitName.slice(-1)[0] === 'test')) {
      // splitName contains version-[number-]arch
      var proj = splitName.pop(); // test or build
      var arch = splitName.pop();
      var version = splitName.join('/');
      if (!tableData[arch]) {
        tableData[arch] = {};
      }
      tableData[arch][version + '-' + proj] = job;
    }
  });

  generateTable(tableData);
  document.body.appendChild(document.createTextNode("Last updated: " + new Date()));
  document.body.appendChild(document.createElement('br'));
  document.body.appendChild(document.createTextNode("Source: "));
  var a = document.createElement('a');
  a.setAttribute('href', 'https://github.com/FreeBSDFoundation/jenkins-tinderbox');
  a.appendChild(document.createTextNode('https://github.com/FreeBSDFoundation/jenkins-tinderbox'));
  document.body.appendChild(a);
});