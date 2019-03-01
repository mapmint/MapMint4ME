//$(function(){
    updateBreadcrumbs(["home","map"]);
    addStatusControl();
    getCurrentStatus();

    addOptionalLocalTiles();
    //$('.breadcrumb').append('<li>Point north <input id="followNorth" type="checkbox" /></li>');

    $("#map").css("height",($(window).height()-150)+"px");
    try{
        console.log("initMapToLocation");
        initMapToLocation();
        console.log("/initMapToLocation");
    }catch(e){
        console.log(e);
    }
    try{
        console.log("displayRecordedData");
        displayRecordedData();
        console.log("/displayRecordedData");
    }catch(e){
        console.log(e);
    }

    localTileIndex=map.getLayers().getLength();
    console.log(localTileIndex);

    //localOrientation()
    var dragBox = new ol.interaction.DragBox({
        condition: ol.events.condition.always
    });

    /*function localOrientation(){
        console.log(JSON.stringify(window.Android.getOrientation()));
        setTimeout(function(){localOrientation();},1200);
    }*/

    function displayRecordedData(){
        //try{
        var query="select a||'.'||b as name, f_geometry_column as gc, type from mm4me_gc, (select substr(name,1,pos-1) as a, substr(name,pos+1) as b from (SELECT  name, instr(name,'.') AS pos FROM mm4me_tables)) where a = f_table_schema and b = f_table_name and (f_table_schema!='mm' and f_table_name!='extent')";
        var list=JSON.parse(window.Android.displayTable(query,[]));
        if(MM4ME_DEBUG)
            console.log(JSON.stringify(list));
        if(list.length>0){
            console.log("Display point and lines");
            var format = new ol.format.WKT();

            for(var i=0;i<list.length;i++){
                query="SELECT count(*) as cnt from "+cleanupTableName(list[i]["name"]);
                var nb=JSON.parse(window.Android.displayTable(query,[]));
                console.log(JSON.stringify(nb));
                if(nb[0]["cnt"]!=0){
                    var pquery="select id, geometry as geom from "+cleanupTableName(list[i]["name"]);
                    var pFeatures=JSON.parse(window.Android.displayTable(pquery,[]));
                    if(MM4ME_DEBUG)
                        console.log(JSON.stringify(pFeatures));
                    if(list[i]["type"]=="POINT"){
                        console.log("Display points");
                        features=[];
                        for(var j=0;j<pFeatures.length;j++){
                            if(pFeatures[j]["geom"])
				features.push(
                                    format.readFeature('POINT'+pFeatures[j]["geom"].replace(","," "), {
					dataProjection: 'EPSG:4326',
					featureProjection: 'EPSG:3857'
                                    })
				);
                        }
                        var bstyle = function (feature, resolution) {
                            var iconFont = 'Glyphicons Halflings';
                            var iconFontText = '\ue007';
                            var iconSize = 22;
                            var opacity=0.4;
                            var col = 'rgba('+i+','+i+','+i+',0.9)';
                            var styles = [];

                            var styleIcon = new ol.style.Style({
                                text: new ol.style.Text({
                                    font: 'Normal ' + iconSize + 'px ' + iconFont,
                                    text: iconFontText,
                                    fill: new ol.style.Fill({ color: col })
                                })
                            });
                            styles.push(styleIcon);
                            return styles;
                        };

                        var vector = new ol.layer.Vector({
                            source: new ol.source.Cluster({
                                distance: parseInt(50, 10),
                                source: new ol.source.Vector({
                                    features: features
                                })
                            }),
                            style: bstyle
                        });
                        map.addLayer(vector);
                    }else{
                        if(list[i]["type"]=="LINESTRING" || list[i]["type"]=="POLYGON"){
                            console.log("Display lines");
                            features=[];
                            for(var j=0;j<pFeatures.length;j++){
                                if(pFeatures[j]["geom"])
                                    try{
                                        features.push(
                                            format.readFeature(pFeatures[j]["geom"], {
						dataProjection: 'EPSG:4326',
						featureProjection: 'EPSG:3857'
                                            })
                                        );
                                    }catch(e){
                                        console.log("Unable to parse WKT ?!"+e)
                                    }
                            }
                            var vector = new ol.layer.Vector({
                                source: new ol.source.Vector({
                                    features: features
                                }),
                                style: new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        color: "#333333",
                                        width: 2
                                    })
                                })

                            });
                            map.addLayer(vector);

                        }
                    }
                }
            }

        }
    }

    function localLoop(){
        var position=JSON.parse(window.Android.getFullGPS());
        try{
            vectorLayer.getSource().clear(true);
        }catch(e){
            console.log(e);
        }
        var iconFeatures=[];
        for(var i=0;i<position.length;i++){
            iconFeatures.push(new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.transform([position[i].lon,position[i].lat], 'EPSG:4326',
							      'EPSG:3857')),
                source: position[i].source
            }));
        }
        vectorLayer.getSource().addFeatures(iconFeatures);
        setTimeout(function(){localLoop()},5000);
    }

    function upgradeMMGPS(){
        console.log("upgradeMMGPS !");
        var toto=document.location.href.split("?");
        var tmp=toto[1].split("=");
        tmp=decodeURIComponent(tmp[1]);
        console.log(decodeURIComponent(tmp));
        var urls=tmp.split("/");
        var params=urls[3].split("?")
        updateCurrentMapLocation();
        var url=urls[0]+"//"+urls[2]+"/cgi-bin/mm/zoo_loader.cgi?request=Execute&service=wps&version=1.0.0&Identifier=modules.AndroidPosition.setLocation&DataInputs=from=AndroidApp;"+params[1]+";lonlat="+position[bestIndex].lon+","+position[bestIndex].lat;
        console.log(url);

        $.ajax({
            method: "GET",
            url: url,
            success: function(data){
                console.log("ok");
                console.log(JSON.stringify(data));
            },
            error: function(data){
                console.log("ERROR !");
                console.log(JSON.stringify(data));
                window.Android.showToast($(data.responseText).find("ows\\:ExceptionText").text());

            }
        });
        setTimeout(function(){upgradeMMGPS();},2000);
    }

    setTimeout(function(){localLoop()},5000);

    console.log(document.location.href);

    console.log(document.location.href.indexOf("mmGPS"));
    if(document.location.href.indexOf("mmGPS")>0){
        upgradeMMGPS();
    }

    console.log("End map.js");
//})();
