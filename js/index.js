function formatDate(date) {
  var dateObj = new Date(Date.parse(date));
  return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
};

function metersToPixelsAtMaxZoom(meters, latitude) {
  return meters / 0.1 / Math.cos(latitude * Math.PI / 180)
}

function makeMap(geojson) {
  mapboxgl.accessToken = 'pk.eyJ1Ijoic3BtYXR0IiwiYSI6Ik5HV3U0MjgifQ.OyvIfF0FxtO0LCNX2CqFpg';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/spmatt/ciksnpcsy004992klvge9h2zb',
    zoom: 2.65,
    center: [-98.35, 39]
  });
  map.on('load', function() {
    $.each(geojson.features, function(index, feature) {
      map.addSource('circle' + index, {
        "type": 'geojson',
        "data": feature
      });
      map.addLayer({
        "id": 'circle' + index,
        "type": 'circle',
        "source": 'circle' + index,
        'paint': {
          'circle-radius': {
            stops: [
              [0, 0],
              [
                20,
                metersToPixelsAtMaxZoom(
                  feature.properties.radius_meters,
                  feature.geometry.coordinates[1]
                )
              ]
            ],
            base: 2
          },
          'circle-opacity': feature.properties['fill-opacity'],
          'circle-color': feature.properties.fill
        }
      });
    });
  });
};

function renderTemplate(templateRef, destinationRef, data) {
  var template = $(templateRef).html();
  var rendered = Mustache.render(template, data);
  $(destinationRef).html(rendered);

};

function renderTemplates() {
  $.ajax({
    url: 'https://s3.amazonaws.com/superpedestrian/status/status.jsonp',
    dataType: 'jsonp',
    jsonpCallback: 'dashboard'
  })
  .done(function(data) {
    console.log(data);
    makeMap(data.point_heatmap);

    // Tweets
    $.each(data.tweets, function(index, value) {
      this.date = formatDate(value.created_at);
    });
    renderTemplate('#twitter-template', '#twitter', data);

    // Stats
    data.twoPlaces = function() {
      return function(text, render) {
        return parseFloat(render(text)).toFixed(2);
      };
    };
    renderTemplate('#stats-template', '#stats', data);

    // App statuses
    var cellsPerRow = 2;
    $.each(data.apps, function(index, value) {
      if (index % cellsPerRow == 0) {
        value.row =  '\
        </div>\
        <div class="grd-row p2">';
      }
    });
    renderTemplate('#web-template', '#web', data);

    // Overall status
    data.updated = formatDate(data.timestamp);
    var status = 'green';
    var appIssues = [];
    $.each(data.apps, function(index, value) {
      if(value.health_status != 'green') {
        appIssues.push(value.name);
        if(value.health_status == 'yellow') {
          if(status != 'red') {
            status = 'yellow';
          }
        } else {
          status = 'red';
        }
      }
    });
    if(status == 'green') {
      data.statusMsg = 'We’re doing great! If there is a problem, we don’t know about it yet.';

    } else if(status == 'yellow') {
      data.statusMsg = 'We’re in the middle of a service disruption and we’ll be back up and running in no time!';
    } else {
      data.statusMsg = 'Uh-oh, looks like we’re in the middle of a serious problem. My Spidey-sense suggests its an all nighter for our software engineers.'
    }
    data.status = status;
    if( appIssues.length > 0) {
      data.appIssues = { apps: appIssues };
    }
    renderTemplate('#overall-template', '#overall', data);
  });
};

$(document).ready(function () {
  renderTemplates();
});
