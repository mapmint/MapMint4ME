$(function(){
updateBreadcrumbs(["home","map"]);
addStatusControl();
getCurrentStatus();

$("#map").css("height",(window.Android.getHeight()-220)+"px");
var osmSource = new ol.source.OSM();
var localTiles = new ol.source.XYZ({
    tileLoadFunction:
        function(imageTile, src) {
            imageTile.getImage().src = "data:image/jpeg;base64,"+window.Android.displayTile(src);console.log("imageTile src set ! ("+src+")");
        },
    attributions: [
        ol.source.OSM.ATTRIBUTION
    ],
    url: "{x},{-y},{z}"
});
      var map = new ol.Map({
        layers: [
          /*new ol.layer.Tile({
            source: osmSource
          }),*/
          new ol.layer.Tile({
            source: localTiles
          })
        ],
        target: 'map',
        controls: ol.control.defaults({
          attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
            collapsible: true
          })
        }),
        view: new ol.View({
          center: ol.proj.transform(
              [0,0], 'EPSG:4326', 'EPSG:3857'),
          zoom: 1,
          maxZoom: 14,
          minZoom: 14
        })
      });

      var bstyle = function (feature, resolution) {

          /*var iconFont = 'glyphicon';
          var iconFontText = '\e062';*/
          //var iconFont = 'glyphicon';
          var iconFont = 'Glyphicons Halflings';
          var iconFontText = '\ue062';
          var iconSize = 24;
          var opacity=0.4;
          var col = 'rgba(0,255,0,0.6)';
          if(feature.get("source")=="GPS")
             col = 'rgba(41,136,54,0.5)';//#298836
          else if(feature.get("source")=="Network"){
             col = 'rgba(91,176,75,0.4)';//#5bb04b
             iconSize = 32;
             opacity=0.2;
          }
          else if(feature.get("source")=="other"){
             col='rgba(129,208,113,0.5)';//#81d071
             iconSize = 36;
             opacity=0.2;
          }
          else
            col='rgba(166,63,39,0.5)'; //#a63f27 //"#EE0000";
          var styles = [];

          var styleIcon = new ol.style.Style({
              text: new ol.style.Text({
                  font: 'Normal ' + iconSize + 'px ' + iconFont,
                  text: iconFontText,
                  fill: new ol.style.Fill({ color: col })
              })
          });
          styles.push(styleIcon);

          //console.log(feature.get("type"));
          return styles;
          /*return function (feature, resolution) {
              styles.styleIcon.getText().setText(feature.get("iconCode"));
              return styles;
          };*/
      };
      var position=JSON.parse(window.Android.getFullGPS());
      console.log(JSON.stringify(position));
      if(position.length==0){
        position=[{lon:3.5,lat:43.5,source:"none"}];
      }
      var iconFeatures = [];
      for(var i=0;i<position.length;i++){
        iconFeatures.push(new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([/*3.5,43.5*/position[i].lon,position[i].lat], 'EPSG:4326',
                'EPSG:3857')),
            source: position[i].source
        }));
      }
      var vectorSource = new ol.source.Vector({
        features: iconFeatures //add an array of features
      });
      //console.log([position.lat, position.lon]);
      //console.log(ol.proj.transform([position.lat, position.lon], 'EPSG:4326','EPSG:3857'));
      var vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: bstyle
      });
      map.addLayer(vectorLayer);
      map.getView().setCenter(ol.proj.transform([position[0].lon,position[0].lat], 'EPSG:4326', 'EPSG:3857'))
      var dragBox = new ol.interaction.DragBox({
              condition: ol.events.condition.always
      });


        function localLoop(){
            var position=JSON.parse(window.Android.getFullGPS());
            vectorLayer.getSource().deleteFeatures(vectorLayer.getSource().getFeatures());
            var iconFeatures=[];
            for(var i=0;i<position.length;i++){
                iconFeatures.push(new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.transform([/*3.5,43.5*/position[i].lon,position[i].lat], 'EPSG:4326',
                        'EPSG:3857')),
                    source: position[i].source
                }));
            }
            vectorLayer.getSource().addFeatures(iconFeatures);
            setTimeout(function(){localLoop()},5000);
        }
        setTimeout(function(){localLoop()},5000);

      map.addInteraction(dragBox);

      dragBox.on('boxend', function() {
        // features that intersect the box are added to the collection of
        // selected features, and their names are displayed in the "info"
        // div
        var info = [];
        var extent = dragBox.getGeometry().getExtent();
        console.log(extent);
      });

      // clear selection when drawing a new box and when clicking on the map
      dragBox.on('boxstart', function() {
      });
      map.on('click', function() {
      });

})();