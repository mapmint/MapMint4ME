$(function(){
    updateBreadcrumbs(["home","map"]);
    addStatusControl();
    getCurrentStatus();

    $("#map").css("height",($(window).height()-150)+"px");
    initMapToLocation();
    var dragBox = new ol.interaction.DragBox({
        condition: ol.events.condition.always
    });

        function localLoop(){
            var position=JSON.parse(window.Android.getFullGPS());
            try{
                vectorLayer.getSource().clear(true);
                //vectorLayer.getSource().removeFeatures(vectorLayer.getSource().getFeatures());
            }catch(e){
                console.log(e);
            }
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

})();