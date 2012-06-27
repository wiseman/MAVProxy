function MapPanner(map) {
    var theMapPanner = this;
    this.map = map;
    this.targetLocation = null;
    
    this.animateToCenter = function() {
	var need_more_animation = false;
	var curLocation = theMapPanner.map.getCenter();
	var nextLat = curLocation.lat + (theMapPanner.targetLocation.lat - curLocation.lat) * 0.2;
	var nextLon = curLocation.lon + (theMapPanner.targetLocation.lon - curLocation.lon) * 0.2;
	if (Math.abs(nextLat - curLocation.lat) < 0.00001) {
	    nextLat = theMapPanner.targetLocation.lat;
	} else {
	    need_more_animation = true;
	}
	if (Math.abs(nextLon - curLocation.lon) < 0.00001) {
	    nextLon = theMapPanner.targetLocation.lon;
	} else {
	    need_more_animation = true;
	}

	theMapPanner.map.setCenter(new MM.Location(nextLat, nextLon));
	if (need_more_animation) {
	    MM.getFrame(this.animateToCenter);
	}
    }

    this.setCenter = function(location) {
	this.targetLocation = location;
	MM.getFrame(this.animateToCenter);
    }

}

function TrailPlotter(marker_clip) {
    this.marker_clip = marker_clip

    var last_trail_time = 0;

    this.update = function() {
	var now = new Date().getTime();
	if (last_trail_time == 0 || now - last_trail_time > 10000) {
            var trail_marker = this.marker_clip.createDefaultMarker(2);
            this.marker_clip.addMarker(trail_marker, new MM.Location(state.lat, state.lon));
            last_trail_time = now;
	}
    }
}


function ADI(container) {
    var theADI = this;

    this.pitch = -90.0 * Math.PI / 180.0;
    this.roll = 90.0 * Math.PI / 180.0;
    this.targetPitch = 0.0;
    this.targetRoll = 0.0;

    var containerElement = document.getElementById(container);
    console.log('CONTAINER ' + containerElement.offsetWidth + 'x' + containerElement.offsetHeight);
    this.stage = new Kinetic.Stage({
        container: container,
	height: containerElement.offsetHeight,
	width: containerElement.offsetWidth
    });
    this.stage.setScale(containerElement.offsetWidth / 100.0,
			containerElement.offsetHeight / 100.0)
    this.layer = new Kinetic.Layer();
    this.plane = new Kinetic.Path({
        x: 50,
        y: 50,
        data: "m -26,0 15,0 3,3 M -1,0 l 2,0 M 26,0 l -15,0 -3,3",
	stroke: "black",
	lineJoin: "round",
	strokeWidth: 2.5,
	shadow: {
	    color: 'black',
	    blur: 5,
	    offset: [1, 1],
	    alpha: 0.5
	},
        scale: 1.2
    });
    // add the shape to the layer
    this.layer.add(this.plane);
    this.horizon = new Kinetic.Path({
	x: 50,
	y: 50,
	data: "m -100,0 200,0",
	stroke: "black",
	lineJoin: "round",
	strokeWidth: 1.7,
	scale: 1
    });
    this.layer.add(this.horizon);
    // add the layer to the stage
    this.stage.add(this.layer);

    this.drawFromAttitude = function(pitch, roll) {
	var horizon_y = 50.0 + 50.0 * Math.sin(pitch);
	theADI.horizon.setY(horizon_y);
	theADI.horizon.setRotation(-roll);
	theADI.layer.draw();
    }

    this.drawFromAttitude(this.pitch, this.roll);
    
    this.animateToAttitude = function() {
	var need_more_animation = false;
	
	var curPitch = theADI.pitch;
	var nextPitch = curPitch + (theADI.targetPitch - curPitch) * 0.05;
	if (Math.abs(nextPitch - curPitch) < 0.001) {
	    nextPitch = theADI.targetPitch;
	} else {
	    need_more_animation = true;
	}
	
	var curRoll = theADI.roll;
	var nextRoll = curRoll + (theADI.targetRoll - curRoll) * 0.05;
	if (Math.abs(nextRoll - curRoll) < 0.001) {
	    nextRoll = theADI.targetRoll;
	} else {
	    need_more_animation = true;
	}
	
	theADI.drawFromAttitude(nextPitch, nextRoll);
	
	theADI.pitch = nextPitch;
	theADI.roll = nextRoll;
	if (need_more_animation) {
	    MM.getFrame(theADI.animateToAttitude);
	}
    }
    
    this.setAttitude = function(pitch, roll) {
	this.targetPitch = pitch;
	this.targetRoll = roll;
	MM.getFrame(this.animateToAttitude);
    }
}


function MarkerClip(map) {

    this.map = map;

    var theClip = this;

    var markerDiv = document.createElement('div');
    markerDiv.id = map.parent.id + '-markerClip-' + new Date().getTime();
    markerDiv.style.margin = '0';
    markerDiv.style.padding = '0';
    markerDiv.style.position = 'absolute';
    markerDiv.style.top = '0px';
    markerDiv.style.left = '0px';
    markerDiv.style.width = map.dimensions.x+'px';
    markerDiv.style.height = map.dimensions.y+'px';        
    map.parent.appendChild(markerDiv);    
    
    function onMapChange() {
        theClip.updateMarkers();    
    }

    map.addCallback('drawn', onMapChange);

    map.addCallback('resized', function() {
        markerDiv.style.width = map.dimensions.x+'px';
        markerDiv.style.height = map.dimensions.y+'px';        
        theClip.updateMarkers();
    });

    this.updateMarkers = function() {
        for (var i = 0; i < this.markers.length; i++) {
            this.updateMarkerAt(i);
        }
    };
    
    this.markers = [];
    this.markerLocations = [];
    this.markerOffsets = [];
    
    this.addMarker = function(element, location, offset) {
        element.style.position = 'absolute';
        if (!offset) {
            offset = new MM.Point(element.offsetWidth/2, element.offsetHeight/2);
        }
        markerDiv.appendChild(element);
        this.markers.push(element);
        this.markerLocations.push(location);
        this.markerOffsets.push(offset);
        this.updateMarkerAt(this.markers.length-1);
    };

    this.setMarkerLocation = function(index, location) {
	this.markerLocations[index] = location;
    }
    
    this.updateMarkerAt = function(index) {
        var point = map.locationPoint(this.markerLocations[index]),
        offset = this.markerOffsets[index],
        element = this.markers[index];
        MM.moveElement(element, { 
            x: point.x - offset.x, 
            y: point.y - offset.y,
            scale: 1, width: element.pxsize, height: element.pxsize });
    };

    var createdMarkerCount = 0;

    this.createDefaultMarker = function(size) {
        var marker = document.createElement('div');
        marker.id = map.parent.id+'-marker-'+createdMarkerCount;
        createdMarkerCount++;
        var px_size = size + 'px';
	marker.pxsize = px_size
        marker.style.width = px_size;
        marker.style.height = px_size;
        marker.style.margin = '0';
        marker.style.padding = '0';
        marker.style.backgroundColor = '#ffffff';
        marker.style.borderWidth = '2px';
        marker.style.borderColor = 'black';
        marker.style.borderStyle = 'solid';
        marker.style.MozBorderRadius = px_size;
        marker.style.borderRadius = px_size;
        marker.style.WebkitBorderRadius = px_size;
        return marker;
    };
}


var map;
var map_layer;
var marker_clip;
var trailPlotter;
var mapPanner;
var last_state_update_time;
var adi;

var state = {};
state.lat = null;
state.lon = null;
state.pitch = 0.0;
state.roll = 0.0
state.heading = 0.0;
state.waypoints = null;



function initMap() {

    // name of a div element:
    var parent = 'map';

    // defaults to Google-style Mercator projection, so works
    // out of the box with OpenStreetMap and friends:
    // var template = 'http://tile.openstreetmap.org/{Z}/{X}/{Y}.png';
    // var provider = new MM.TemplatedMapProvider(template);

    // --------------------
    // Blue Marble
    // var provider = new MM.BlueMarbleProvider();

    // --------------------
    // Microsoft Bing
    // please use your own API key!  This is jjwiseman's!
    var key = "Anmc0b2q6140lnPvAj5xANM1rvF1A4CvVtr6H2VJvQcdnDvc8NL-I2C49owIe9xC";
    var style = 'AerialWithLabels';
    var provider = new MM.BingProvider(key, style);

    map_layer = new MM.Layer(provider);

    // without a size, it will expand to fit the parent:
    map = new MM.Map(parent, map_layer, null, null);

    marker_clip = new MarkerClip(map);
    //var marker = marker_clip.createDefaultMarker(20);
    //var location = new MM.Location(0, 0);
    //marker.title = "lovedrone";
    //marker_clip.addMarker(marker, location);

    map.setCenterZoom(new MM.Location(20.0, 0), 18);

    setInterval(updateState, 250);
    $('#layerpicker').change(updateLayer);

    trailPlotter = new TrailPlotter(marker_clip);
    mapPanner = new MapPanner(map);
    
    adi = new ADI("adi");

    var zoomSlider = document.getElementById('zoom');
    zoomSlider.onchange = function() {
	var sliderProp = (zoomSlider.value - zoomSlider.min) / (zoomSlider.max - zoomSlider.min);
	var targetZoom = sliderProp * 18.0; 
	map.setZoom(targetZoom);
    };
}


function updateLinkStatus() {
    var now = (new Date()).getTime();
    if (!last_state_update_time) {
	$("#t_link").html('<span class="link error">NO</span>');
    } else if (now - last_state_update_time > 5000) {
	$("#t_link").html('<span class="link error">TIMEOUT</span>');
    } else if (now - last_state_update_time > 1000) {
	$("#t_link").html('<span class="link slow">SLOW</span>');
    } else {
	$("#t_link").html('<span class="link ok">OK</span>');
    }
}

function updateState() {
    $.getJSON("data",
	      function(data){
		  state = data;
		  updateTelemetryDisplay();
		  updateMap();
		  last_state_update_time = new Date().getTime();
	      });
    updateLinkStatus();
}


function updateMap() {
    var location = new MM.Location(state.lat, state.lon);
    if (!last_state_update_time) {
	map.setCenter(location);
    } else {
	mapPanner.setCenter(location);
    }
}


function updateTelemetryDisplay() {
    $("#t_lat").html(state.lat.toPrecision(11));
    $("#t_lon").html(state.lon.toPrecision(11));
    $("#t_alt").html(state.alt.toPrecision(4));
    $("#t_gspd").html(state.groundspeed.toPrecision(2));
    $("#t_aspd").html(state.airspeed.toPrecision(2));
    $("#t_hdg").html(state.heading)
    now = new Date().getTime();
    $("#t_fps").html((1000.0 / (now - last_state_update_time)).toPrecision(3));
    if (state.gps_fix_type >= 3) {
	$("#t_gps").html('<span class="ok">OK</span>');
    } else if (state.gps_fix_type == 2) {
	$("#t_gps").html('<span class="slow">02</span>');
    } else if (state.gps_fix_type <= 1) {
	$("#t_gps").html('<span class="error">' + state.gps_fix_type + '</span>');
    }
    adi.setAttitude(state.pitch, state.roll);
    
    rotate_drone(state.heading)
    trailPlotter.update();
    marker_clip.setMarkerLocation(0, new MM.Location(state.lat, state.lon));
}


function rotate_drone(deg){
    var rotate = "rotate(" + (deg) + "deg);";
    var tr = new Array(
	"transform:" + rotate,
	"-moz-transform:" + rotate,
	"-webkit-transform:" + rotate,
	"-ms-transform:" + rotate,
	"-o-transform:" + rotate
    );

    var drone = document.getElementById("drone");
    drone.setAttribute("style", tr.join(";"));
}


function updateLayer() {
    var provider;
    var layerNum = $(this).attr('value');
    console.log("Switching to layer " + layerNum);
    var bing_key = "Anmc0b2q6140lnPvAj5xANM1rvF1A4CvVtr6H2VJvQcdnDvc8NL-I2C49owIe9xC";
    if (layerNum == '1') {
	var style = 'AerialWithLabels';
	provider = new MM.BingProvider(bing_key, style, function(provider) { map_layer.setProvider(provider); });
    } else if (layerNum == '2') {
	var style = 'BirdseyeWithLabels';
	provider = new MM.BingProvider(bing_key, style, function(provider) { map_layer.setProvider(provider); });
    } else if (layerNum == '3') {
	var style = 'Road';
	provider = new MM.BingProvider(bing_key, style, function(provider) { map_layer.setProvider(provider); });
    } else if (layerNum == '4') {
	provider = new MM.BlueMarbleProvider();
	map_layer.setProvider(provider);
    }
}