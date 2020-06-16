var runOnce=true;
var hasDependencies=false;
$(function(){
    if(!runOnce)
        return;
    runOnce=false;
    updateBreadcrumbs(["home","map"]);
    addStatusControl();
    getCurrentStatus();


    addOptionalLocalTiles();
    //$('.breadcrumb').append('<li>Point north <input id="followNorth" type="checkbox" /></li>');

var list=JSON.parse(window.Android.displayTable("SELECT mm4me_tables.id as tid,mm4me_views.id as id,mm4me_tables.name as name,mm4me_tables.description,mm4me_views.name as title from mm4me_tables,mm4me_views where mm4me_tables.id=mm4me_views.ptid ",[]));
                                                    var tableList=list;
                                                    var total=0;
                                                    console.log(JSON.stringify(list))
                                                    var index=-1;
                                                    for(var i in list){
                                                        mainTable[list[i]["id"]]=list[i]["tid"];
                                                    }
                                                contents=[];


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
        displayDependentData();
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

    function displayDependentData(){
        //try{
        var query="select f_table_name as name, f_geometry_column as gc, (select type from mm4me_gc where mm4me_gc.f_table_name like geometry_columns.f_table_name or mm4me_gc.f_table_name like substr(geometry_columns.f_table_name,1,length(geometry_columns.f_table_name)-2) ) as type from geometry_columns where f_table_name in (select tname from mm4me_georef)";
        //var query="select f_table_name as name, f_geometry_column as gc, type from mm4me_gc where f_table_name in (select tname from mm4me_georef);";
        try{
        var list=JSON.parse(window.Android.displayTable(query,[]));
        }catch(e){
            console.log(e);
            return;
        }
        if(MM4ME_DEBUG)
            console.log(JSON.stringify(list));
        if(list.length>0){
            console.log("Display point and lines");

            console.log("#mm4me_ls");
            console.log($(".map").html());

            console.log($("#zoomOnFeatures").html());
            $(".zoomOnFeatures").show();
            $("#zoomOnFeatures").parent().parent().show();
            $(".zoomOnFeatures").on('check',function(){
                console.log($(this).is(":checked"));

            });
            console.log($("#mm4me_ls").find(".dropdown-menu").html());

            var format = new ol.format.WKT();

            for(var i=0;i<list.length;i++){
                query="SELECT count(*) as cnt from "+cleanupTableName(list[i]["name"]);
                var nb=JSON.parse(window.Android.displayTable(query,[]));
                console.log(JSON.stringify(nb));
                if(nb[0]["cnt"]!=0){
                    hasDependencies=true;
                    $(".zoomOnFeatures").show();
                    console.log($("#zoomOnFeatures").html());
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
                        if(list[i]["type"].indexOf("LINESTRING")>=0 || list[i]["type"].indexOf("POLYGON")>=0){
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
                                        features[features.length-1].setId(pFeatures[j]["id"]);
                                        features[features.length-1].set("id",pFeatures[j]["id"]);
                                        features[features.length-1].set("collection",cleanupTableName(list[i]["name"]));
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
                                        color: "#AA0000",
                                        fill: "#990000",
                                        opacity: 0.4,
                                        width: 2
                                    })
                                })

                            });
                            map.addLayer(vector);
                            var select = new ol.interaction.Select({
                                condition: ol.events.condition.click
                            });
                            document.getElementById('map').addEventListener('touchend', function () {
                                //select.select();
                                //console.log('touch');
                            });
                            map.addInteraction(select);
                            (function(tableName){
                                select.on('select', function(e) {
                                    if(e.target.getFeatures().getLength()==1){
                                        console.log("Print window to access feature edition");
                                        var feature=e.target.getFeatures().item(0);
                                        if(feature==null)
                                            return;
                                        var featureProperties=feature.getProperties();
                                        for(var l in featureProperties)
                                            console.log(l+" "+featureProperties[l]);
                                        console.log(featureProperties["id"]);
                                        tableName=featureProperties["collection"];
                                        var sqlReq="select ref_col, origin_col, origin_table from mm4me_georef where tname='"+tableName+"'";
                                        var res=window.Android.displayTable(sqlReq,[]);
                                        console.log(res);
                                        var list=JSON.parse(res);
allTables={};
                                        sqlReq="select col from primary_keys where tbl='"+cleanupTableName(list[0]["origin_table"])+"' ;";
                                        var res0=window.Android.displayTable(sqlReq,[]);
                                        console.log(res0);
                                        var res=JSON.parse(res0);

                                        sqlReq="SELECT "+res[0]["col"]+" as id from "+cleanupTableName(list[0]["origin_table"])+" WHERE "+list[0]["origin_col"]+"="+featureProperties["id"];
                                        console.log(window.Android.displayTable(sqlReq,[]));
                                        var res1=JSON.parse(window.Android.displayTable(sqlReq,[]));
                                        console.log(res1[0]["id"]);

                                        sqlReq="SELECT mm4me_tables.id as id, "+
                                                           "mm4me_tables.name as name, "+
                                                           "mm4me_tables.description, "+
                                                           "mm4me_tables.title "+
                                                           " from mm4me_tables "+
                                                           " WHERE name='"+list[0]["origin_table"]+"'";
                                        var res2=JSON.parse(window.Android.displayTable(sqlReq,[]));

                                        for(var l in mainTable){
                                            console.log(l);
                                            console.log(mainTable[l]);

                                            if(mainTable[l]==res2[0]["id"])
                                                index=l;
                                        }
                                        console.log(res2[0]["id"]);

                                        doModal("<i class='glyphicon glyphicon-edit'></i> "+res2[0]["title"]+" "+res1[0]["id"],'<div id="edition_form_edit" class="mm4me_edition tab-pane" role="tabpanel">'+
                                                                                                '<ul class="nav nav-tabs">'+
                                                                                                '</ul>'+
                                                                                                '<div class="tab-content">'+
                                                                                                '</div>'+
                                                                                            '</div>');
                                        editChangeOnce=false;
                                        listEditFromMap(index,res2[0]["name"],res2[0]["title"]);
                                        /*$(".mm-act-add").first().removeClass("mm-act-add").addClass("mm-act-save").html(window.Android.translate("save")).off("click").click(function(){
                                                        console.log(mid);
                                                        console.log(JSON.stringify(mainTable));
                                                        console.log(JSON.stringify(allTables[mid]["id"]));
                                                        runUpdateQuery($(this).parent().parent(),mainTable[allTables[mid]["id"]],editOnlyTableReact);
                                                    });
                                        $(".require-select").show();
                                        //setTimeout(function(){$(".mm-edit-field").find(".require-select").show();},500);
                                        */

                                        systemSelectedIndex=res1[0]["id"];
                                        console.log("call editOnlyTableReactFromMap");
                                        editOnlyTableReactFromMap(res2[0]["id"]);
                                        /*displayEditForm(index,res1[0]["id"],true);
                                        */


                                        console.log( '&nbsp;' +
                                                    e.target.getFeatures().getLength() +
                                                    ' selected features (last operation selected ' + e.selected.length +
                                                    ' and deselected ' + e.deselected.length + ' features)');
                                    }
                                });
                            })(cleanupTableName(list[i]["name"]));
                        }
                    }
                }
            }

        }
    }


    function doModal(heading, formContent) {
        //if($("#dynamicModal").length==0){
        html =  '<div id="dynamicModal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="confirm-modal" aria-hidden="true">';
        html += '<div class="modal-dialog">';
        html += '<div class="modal-content">';
        html += '<div class="modal-header">';
        html += '<a class="close" data-dismiss="modal">×</a>';
        html += '<h4>'+heading+'</h4>'
        html += '</div>';
        html += '<div class="modal-body">';
        html += formContent;
        html += '</div>';
        html += '<div class="modal-footer">';
        html += '<span class="btn btn-primary" data-dismiss="modal"><i class="glyphicon glyphicon-remove"></i> '+window.Android.translate("cancel")+'</span>';
        html += '</div>';  // content
        html += '</div>';  // dialog
        html += '</div>';  // footer
        html += '</div>';  // modalWindow
        $('body').append(html);
        //}
        $("#dynamicModal").modal();
        $("#dynamicModal").modal('show');

        $('#dynamicModal').on('hidden.bs.modal', function (e) {
            $(this).remove();
            //console.log("hide");
        });

    }

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
                        if(list[i]["type"].indexOf("LINESTRING")>=0 || list[i]["type"].indexOf("POLYGON")>=0){
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
                                })/*,
                                style: new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        color: "#333333",
                                        width: 2
                                    })
                                })*/

                            });
                            map.addLayer(vector);

                        }
                    }
                }
            }

        }
    }



    /*****************************************************************************
     * Display the content edit form for the current table.
     *****************************************************************************/
    function listEditFromMap(id,name,title,prefix){
        tblId=mainTable[id];
        tblName=name;
        tblTitle=title;

        var list=window.Android.displayTable("select mm4me_editions.id,mm4me_editions.name,mm4me_editions.description from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+tblId+" and step>=1 order by mm4me_editions.step asc",[]);
        if(MM4ME_DEBUG)
            console.log(list);
        list=JSON.parse(list);
        if(MM4ME_DEBUG)
            console.log((!allTables[tblId]));
        if(!allTables[tblId]){
            allTables[tblId]={"id":id,"name":name,"title":title};
        }
        mtable=tblId;

        $(".mm4me_edition").find("ul").first().html("");
        $(".mm4me_edition").find(".well").first().html("");
        var cnt=0;
        for(var i in list){
            lastEdition[list[i]["id"]]=list[i];
            var cid=(i==0?list[i]["id"]+"_0":list[i]["id"]);
            if(list[i]["name"])
            $(".mm4me_edition").find("ul").first().append('<li role="presentation" id="edition_link_'+cid+'"><a data-toggle="tab" href="#edition_form_'+cid+'">'+list[i]["name"]+'</a></li>');
            printEditionFields(list[i],$("#edition_form_edit"),cid,mainTable[id]);
        }
        if(list.length==1)
            $(".mm4me_edition").find("ul").first().hide();

        var aCnt=0;
        /*$('.mm4me_edition').find('ul').first().find('a').each(function () {
            if(aCnt>0)
                $(this).parent().addClass('require-select');
            aCnt+=1;
        });*/
        $(".require-select").show();
        $('.mm4me_listing').find('ul').first().find('a').first().click();
        $('.mm4me_edition').find('ul').find('a').first().click();
        $('.swagEditor').summernote();
        $(".mm-act-add").click(function(){
            runUpdateQuery($(this).parent().parent(),mainTable[id],editOnlyTableReactFromMap);
        });
        $(".mm-act-save").click(function(){
            runUpdateQuery($(this).parent().parent(),mainTable[id],editOnlyTableReactFromMap);
        });
        setTimeout(function() { updateChangingFields(changingFields) }, 1500);

        $('.mm4me_listing').show();
        $('.mm4me_content').hide();

    }

    /*****************************************************************************
     * The function to call at the end of insert or update query (edit only)
     *****************************************************************************/
    function editOnlyTableReactFromMap(tid){
        var mid=tid;
        if(MM4ME_DEBUG)
            console.log("editOnlyTableReactFromMap("+mid+')');
        console.log(mtable);
        if(mid==mtable){
                $('.mm4me_listing').find('ul').first().find('a').first().click();
                //var ccol=getPKey(cleanupTableName(allTables[mid].name));
                //var list=JSON.parse(window.Android.displayTable("select max("+ccol+") as val from "+cleanupTableName(allTables[mid].name),[]));
                if(!editChangeOnce){
                    $(".mm-act-add").first().removeClass("mm-act-add").addClass("mm-act-save").html(window.Android.translate("save")).off("click").click(function(){
                        console.log(mid);
                        console.log(JSON.stringify(mainTable));
                        console.log(JSON.stringify(allTables[mid]["id"]));
                        runUpdateQuery($(this).parent().parent(),mainTable[allTables[mid]["id"]],editOnlyTableReactFromMap);
                    });
                    editChangeOnce=true;
                }
                setTimeout(function(){$(".mm-edit-field").find(".require-select").hide();},500);
                //systemSelectedIndex=list[0].val;
                displayEditForm(mid,systemSelectedIndex,false,false);
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
});
