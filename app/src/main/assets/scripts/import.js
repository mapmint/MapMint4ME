$(function(){
    if(MM4ME_DEBUG)
        console.log('run');
    var chooseId=null;

    updateBreadcrumbs(["home","mm_import"]);
    addStatusControl();
    getCurrentStatus();
    $(".mm4me_content").find("p").first().html(window.Android.translate("import_intro_p"));
    $(".mm4me_content").find(".btn-success").first().html('<i class="glyphicon glyphicon-plus"></i> '+window.Android.translate("noserver_btn"));

    // Retrieve number of configured servers
    var list=JSON.parse(window.Android.displayTableFromDb("servers.db","SELECT count(*) as a FROM mm4me_servers",[]));
    if(MM4ME_DEBUG)
        console.log(JSON.stringify(list));
    if(list[0]["a"]==0){
        $.ajax({
            method: "GET",
            url: 'content/noserver.html',
            success: function(data){
                if(MM4ME_DEBUG)
                    console.log('Display warning message on the UI !');
                $(".mm4me_content").html(data);
                $("p").first().html(window.Android.translate("noserver_intro_p"));
                $(".btn-success").first().html('<i class="glyphicon glyphicon-plus"></i> '+window.Android.translate("noserver_btn"));
            },
            error: function(){
                alert("error fetching noserver.html file!");
            }
        });
        return;
    }

    // Retrieve every servers with the last_import datetime
    var list=JSON.parse(window.Android.displayTableFromDb("servers.db","SELECT datetime(last_import, 'unixepoch', 'localtime') as localtime, * FROM mm4me_servers",[]));
    var regs=[
        new RegExp("\\[title\\]","g"),
        new RegExp("\\[id\\]","g"),
        new RegExp("\\[time\\]","g")
    ];
    if(MM4ME_DEBUG)
        console.log(JSON.stringify(list));
    for(var i=0;i<list.length;i++){
        if(MM4ME_DEBUG)
            console.log(JSON.stringify(list[i]));
        $(".media-list").append($("#servers_list_template")[0].innerHTML.
                                replace(regs[1],list[i]["id"]).
                                replace(regs[0],list[i]["name"]).
                                replace(regs[2],(list[i]["localtime"]!=''?list[i]["localtime"]:window.Android.translate("import_never"))));
        var cmd=function(a){
            var closure=a;
            return function(){
                closure1=$(this);
                authenticate(closure["url"],closure["login"],closure["password"],function(){console.log(closure['url']);console.log(closure1);checkTilesList(closure1,closure["url"]);});
            }
        };
        $(".media-list").find("button").last().click(cmd(list[i]));
    }

    // Update the ongoing status using GetStatus URL
    function ping(myRoot,url,origin_url){
        console.log(url);
        $.ajax({
            method: "GET",
            url: url,
            dataType: "xml",
            success: function(data){
                try{
                    var myData=arguments[2].responseText;
                    if($(myData).find("ows\\:ExceptionText").length){
                        disconnect(origin_url);
                        myRoot.parent().append('<div class="alert alert-danger">'+$(myData).find("ows\\:ExceptionText").text()+'</div>');
                        if(MM4ME_DEBUG)
                            console.log("error should be displayed: "+$(myData).find("ows\\:ExceptionText").text());
                        return false;
                    }
                    if($(myData).find("wps\\:ProcessSucceeded").length){
                        if(MM4ME_DEBUG)
                            console.log('SUCCESS!');
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start"));
                        console.log("import_download_start");
                        myRoot.find('.progress-bar').css("width","100%").attr('aria-valuenow', 100).html("100%");
                        var dbs=["local.db","edit.db","tiles.db"];
                        var lcnt0=0;
                        $(myData).find("wps\\:Reference").each(function(){
                            if(chooseId==-1 && lcnt0==2){
                                console.log("Nothing to do!");
                            }else{
                                var curl=$(this).attr("href");
                                if(MM4ME_DEBUG)
                                    console.log(curl);
                                //window.Android.notify(window.Android.translate("import_download_start")+" "+dbs[lcnt0]);
                                myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start"));
                                window.Android.showToast(window.Android.translate("import_download_start"));
                                var downloadedFile=window.Android.downloadFile(curl);
                                myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_end")+" "+downloadedFile);
                                //downloadedFile=window.Android.downloadedFile();
                                if(MM4ME_DEBUG)
                                    console.log(downloadedFile);
                                if(!window.Android.copyFile(downloadedFile,dbs[lcnt0])){
                                    myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_failure"));
                                    return ;
                                }
                            }
                            console.log(dbs[lcnt0]);
                            lcnt0+=1;
                        });
                        window.Android.executeQueryFromDb("servers.db","UPDATE mm4me_servers set last_import=strftime('%s','now') WHERE url='"+origin_url+"'",[],[])
                        if(MM4ME_DEBUG){
                            console.log("UPDATE mm4me_servers set last_import=strftime('%s','now') WHERE url='"+origin_url+"'");
                        }
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
                        disconnect(origin_url);
                        return;
                    }
                    if(!$(myData).find("wps\\:ProcessSucceeded").length){
                        console.log(data["documentElement"]["outerHTML"]);
                        console.log($(myData).find("wps\\:ProcessStarted").attr("percentCompleted"));
                        var percentCompleted=parseInt($(myData).find("wps\\:ProcessStarted").attr("percentCompleted"));
                        if(MM4ME_DEBUG){
                            console.log(percentCompleted);
                        }
                        try{
                            myRoot.find('.progress-bar').css("width",percentCompleted+"%").attr('aria-valuenow', percentCompleted).html(percentCompleted+"%");
                            myRoot.find('.progress-bar').parent().next().html($(myData).find("wps\\:ProcessStarted").text());
                        }catch(e){
                            console.log(e);
                        }
                        if(percentCompleted<100)
                            setTimeout(function() { ping(myRoot, url,origin_url); }, 2000);
                    }else
                        setTimeout(function() { ping(myRoot, url,origin_url); }, 2000);
                    if(MM4ME_DEBUG)
                        console.log("timeout set");
                }catch(e){
                    alert("Error during treatment occuring when fetching/updating display for GetStatus: "+e);
                    disconnect(origin_url);
                }
            },
            error: function(){
                window.Android.showToast("PING FAILED !");
                disconnect(origin_url);
            }
        });
    }

    // Invoke the mm4me.createSqliteDB4ME WPS service
    function createSqliteDB4ME(elem,url,cid){
        var curl=url+"?service=WPS&version=1.0.0&request=Execute&Identifier=mm4me.createSqliteDB4ME&DataInputs=tileId="+cid+"&ResponseDocument=Result@asReference=true;Result1@asReference=true;Result2@asReference=true&storeExecuteResponse=true&status=true";
        if(MM4ME_DEBUG)
            console.log(curl);
        $.ajax({
            method: "GET",
            url: curl,
            dataType: "xml",
            success: function(ldata){
                var statusLocation=$(ldata["documentElement"]["outerHTML"]).attr("statusLocation")||$(ldata["documentElement"]).attr("statusLocation");
                if(MM4ME_DEBUG)
                    console.log(statusLocation);
                if(statusLocation)
                    ping(elem.parent().parent().parent(),statusLocation,url);
            },
            error: function(data){
                console.log(data);
            }
        });
    }

    var myData;
    function checkTilesList(elem,url){
        var curl = url + "?request=Execute&service=WPS&version=1.0.0&Identifier=np.list&DataInputs=table=mm.extents&RawDataOutput=Result";
        console.log(curl);
        //if($("#myModal").length)
        $.ajax({
            method: "GET",
            url: curl,
            dataType: "json",
            success: function(ldata){
                console.log(JSON.stringify(ldata));
                myData=ldata;
                $.ajax({
                    method: "GET",
                    url: "./list-modal.html",
                    success: function(ldata){
                        chooseId=null;
                        console.log(JSON.stringify(ldata));
                        $("body").append(ldata);
                        var regId=new RegExp("\\[VALUE\\]","g");
                        var regName=new RegExp("\\[NAME\\]","g");
                        var regSize=new RegExp("\\[SIZE\\]","g");
                        $("#extentList").html($("#extentListItem_template")[0].innerHTML.replace(regId,-1).replace(regName,"Use current tiles").replace(regSize,"0Mb"));
                        for(var i=0;i<myData.length;i++)
                            $("#extentList").append($("#extentListItem_template")[0].innerHTML.replace(regId,myData[i]["id"]).replace(regName,myData[i]["text"]).replace(regSize,myData[i]["size"]));
                        $("#extentList").find("input").each(function(){
                            $(this).off("click");
                            $(this).on("click",function(e){
                                for(var i=0;i<myData.length;i++)
                                    if(myData[i]["id"]==$(this).val()){
                                        var coords=myData[i]["ext"].split(',');
                                        var linearRing=new ol.geom.LinearRing([[coords[0],coords[1]],[coords[0],coords[3]],[coords[2],coords[3]],[coords[2],coords[1]],[coords[0],coords[1]]]);
                                        var myPolygon=new ol.geom.Polygon();
                                        myPolygon.appendLinearRing(linearRing);
                                        vectorLayer1.getSource().clear();
                                        vectorLayer1.getSource().addFeature(new ol.Feature({
                                            "geometry": myPolygon,
                                            "name": "myPolygon"
                                        }));
                                        map.getView().fit(myPolygon.getExtent(),map.getSize());
                                        break;
                                    }
                            });
                        });
                        $("#myModal").find(".glyphicon-ok").first().parent().off('click');
                        $("#myModal").find(".glyphicon-ok").first().parent().click(function(e){
                            chooseId=$("#extentList").find("input[type=radio]:checked").val();
                            createSqliteDB4ME(elem,url,chooseId);
                        });
                        $('#myModal').off('hide.bs.modal');
                        $('#myModal').on('hide.bs.modal', function () {
                            if(chooseId==null)
                                disconnect(url);
                        });
                        $('#myModal').off('shown.bs.modal');
                        $('#myModal').on('shown.bs.modal', function () {
                            $("#extentList").css("max-height",($(window).height()/4)+"px");
                            $("#extentList").css("overflow","auto");
                            $("#map").css("height",($(window).height()/2)+"px");
                            initMapToLocation();

                        });

                        $('#myModal').modal();
                    },
                    error: function(data){
                        console.log("ERROR");
                        console.log(JSON.stringify(data));
                        createSqliteDB4ME(elem,url,0);
                        console.log(JSON.stringify(data));
                    }
                });

            },
            error: function(data){
                console.log("ERROR");
                console.log(JSON.stringify(data));
                createSqliteDB4ME(elem,url,0);
                console.log(JSON.stringify(data));
            }
        });
    }
});