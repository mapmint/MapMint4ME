    var chooseId=null;
    var currentServer=null;
    var nbDownloads=3;
    var nbDownloaded=0;
    var dbs=["local.db","edit.db","tiles.db","baseLayers.json"];
    var dbsAliases=["mm4medb_","mm4meedit_","Tiles","ZOO_DATA_"];

    var current_url;

    function getDbName(val){
        for(var i=0;i<dbsAliases.length;i++)
            if(val.indexOf(dbsAliases[i])>=0)
                return i;
        return -1;
    }

    function postUpdate(){
        console.log("RUN POSTUPDATE! "+arguments[0]+" "+arguments[1]+" "+nbDownloads);
        //var downloadedFile=window.Android.downloadedFile();
        if(arguments[1]==2 && chooseId==-1)
            arguments[1]+=1;
        var cid=getDbName(arguments[0]);
        currentServer.find('.progress-bar').parent().next().html(window.Android.translate("import_download_end")+" "+dbs[cid]);
        if(MM4ME_DEBUG){
            console.log(dbs[cid]);
            console.log(getDbName(arguments[0]));
        }

        if(cid>=0 && !window.Android.copyFile(arguments[0],dbs[cid])){
            currentServer.find('.progress-bar').parent().next().html(window.Android.translate("import_failure"));
            window.Android.reinitCounter();
        }
        nbDownloaded+=1;
        if(MM4ME_DEBUG){
            console.log(nbDownloaded);
            console.log(nbDownloads);
            console.log(chooseId);
            console.log(nbDownloaded+((chooseId==null || chooseId<0)?(chooseId<0?0:1):0));
        }
        if((nbDownloaded+((chooseId==null || chooseId<0)?(chooseId<0?0:1):0))==nbDownloads){
            window.Android.executeQueryFromDb("servers.db","UPDATE mm4me_servers set last_import=strftime('%s','now') WHERE url='"+current_url+"'",[],[])
            if(MM4ME_DEBUG){
                console.log("UPDATE mm4me_servers set last_import=strftime('%s','now') WHERE url='"+current_url+"'");
            }
            currentServer.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
            window.Android.reinitCounter();
            chooseId=null;
            nbDownloaded=0;
        }
        window.Android.screenCanGoOff();
    }

    var nbDFailed=0;
    function downloadFailed(){
        if(nbDFailed==0)
            currentServer.find('.progress-bar').parent().next().html(window.Android.translate("import_failure")+" "+dbs[arguments[1]]+": "+arguments[0]);
        else
            currentServer.find('.progress-bar').parent().next().append(window.Android.translate("import_failure")+" "+dbs[arguments[1]]+": "+arguments[0]);
        downloadFailed++;
    }

$(function(){
    if(MM4ME_DEBUG)
        console.log('run');

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
                authenticate(closure["url"],closure["login"],closure["password"],function(){console.log(closure['url']);console.log(closure1);checkTilesList(closure1,closure["url"]);},function(){
                    disconnect(closure["url"],function(){
                        authenticate(closure["url"],closure["login"],closure["password"],function(){console.log(closure['url']);console.log(closure1);checkTilesList(closure1,closure["url"]);});
                    });

                });
            }
        };
        $(".media-list").find("button").last().click(cmd(list[i]));
        (function(a){
            var closure=a;
            $(".media-heading").last().find("a").on("click",function(){
                console.log("Update config");
                console.log(closure["id"]);
                $.ajax({
                    method: "GET",
                    url: "file:///android_asset/content/login.html",
                    success: function(data){
                        console.log("SUCCESS");
                        console.log(data);
                        doModal(window.Android.translate("settings")+" "+closure["name"],data);
                        $(".btn-group").remove();
                        $("#inputServer").parent().find("h2").append(closure["name"]);
                        $("#inputServer").val(closure["name"]);
                        $("#inputUrl").val(closure["url"]);
                        $("#inputLogin").val(closure["login"]);
                        $("#inputPassword").val(closure["password"]);
                        var localList=JSON.parse(window.Android.displayTableFromDb("servers.db","SELECT count(*) as cnt FROM mm4me_servers",[]));
                        console.log(window.Android.displayTableFromDb("servers.db","SELECT count(*) as cnt FROM mm4me_servers",[]));
                        if(localList[0]["cnt"]>1){
                            $("#dynamicModal").find(".btn-danger").show();
                            $("#dynamicModal").find(".btn-danger").off('click');
                            $("#dynamicModal").find(".btn-danger").on('click',function(){
                                console.log(closure["id"]);
                                var query="DELETE FROM mm4me_servers where id="+closure["id"];
                                console.log(query);
                                window.Android.executeQueryFromDb("servers.db",query,[],[]);
                                console.log("OK ---- "+query);
                                window.Android.showToast(window.Android.translate("delete_server_success"));
                                document.location="file:///android_asset/import.html";
                            });
                        }else{
                            $("#dynamicModal").find(".btn-danger").hide();
                        }

                        $("#dynamicModal").find(".btn-success").off('click');
                        $("#dynamicModal").find(".btn-success").on('click',function(){
                            console.log(closure["id"]);
                            var query="UPDATE mm4me_servers set name=?, url=?, login=?, password=? where id="+closure["id"];
                            window.Android.executeQueryFromDb("servers.db",query,[$("#inputServer").val(),$("#inputUrl").val(),$("#inputLogin").val(),$("#inputPassword").val()],[1,1,1,1]);
                            window.Android.showToast(window.Android.translate("update_server_success"));
                            document.location="file:///android_asset/import.html";
                        });
                    },
                    error: function(data){
                        console.log("ERROR");
                    }
                 });
            });
        })(list[i]);
    }

function doModal(heading, formContent) {
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
    html += '<span class="btn btn-danger" data-dismiss="modal"><i class="glyphicon glyphicon-trash"></i> '+window.Android.translate("delete")+'</span>';
    html += '<span class="btn btn-success" data-dismiss="modal"><i class="glyphicon glyphicon-ok"></i> '+window.Android.translate("save")+'</span>';
    html += '<span class="btn btn-primary" data-dismiss="modal"><i class="glyphicon glyphicon-remove"></i> '+window.Android.translate("cancel")+'</span>';
    html += '</div>';  // content
    html += '</div>';  // dialog
    html += '</div>';  // footer
    html += '</div>';  // modalWindow
    $('body').append(html);
    $("#dynamicModal").modal();
    $("#dynamicModal").modal('show');

    $('#dynamicModal').on('hidden.bs.modal', function (e) {
        $(this).remove();
    });

}


    function mm4meDownload(elem,curl,lcnt0){
        var curl=elem.attr("href");
        var downloadedFile=window.Android.downloadFile(curl);
        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start")+" "+dbs[lcnt0]);
        window.Android.showToast(window.Android.translate("import_download_start"));
    }

    // Update the ongoing status using GetStatus URL
    function ping(myRoot,url,origin_url){
        console.log(url);
        currentServer=myRoot;
        current_url=origin_url;
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
                        //myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start"));
                        console.log(window.Android.translate("import_download_start"));
                        myRoot.find('.progress-bar').css("width","100%").attr('aria-valuenow', 100).html("100%");

                        var lcnt0=0;
                        currentServer=myRoot;
                        $(myData).find("wps\\:Reference").each(function(){
                            console.log(chooseId);
                            console.log(lcnt0);
                            if(chooseId==-1 && lcnt0==2){
                                console.log("Nothing to do!");
                                //lcnt0+=1;
                            }else
                            /*if(lcnt0<=2)*/{
                                (function(elem,lcnt0){
                                setTimeout(function() {
                                    var curl=elem.attr("href");
                                    if(MM4ME_DEBUG)
                                        console.log(curl);
                                    //window.Android.notify(window.Android.translate("import_download_start")+" "+dbs[lcnt0]);
                                    var downloadedFile=window.Android.downloadFile(curl);
                                    //myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start"));
                                    myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start")+" "+dbs[lcnt0]);
                                    window.Android.showToast(window.Android.translate("import_download_start")+" "+dbs[lcnt0]);
                                    console.log(dbs[lcnt0]);
                                }, (elem.attr("href").indexOf('tile')<0?2000:1500));
                                })($(this),lcnt0);
                                /*myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_end")+" "+downloadedFile);
                                //downloadedFile=window.Android.downloadedFile();
                                if(MM4ME_DEBUG)
                                    console.log(downloadedFile);
                                if(!window.Android.copyFile(downloadedFile,dbs[lcnt0])){
                                    myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_failure"));
                                    return ;
                                }*/

                            }
                            lcnt0+=1;
                            console.log(dbs[lcnt0]);
                        });
                        /*$(myData).find("wps\\:Reference").last().each(function(){
                                                        var curl=$(this).attr("href");
                                                        if(MM4ME_DEBUG)
                                                            console.log(curl);
                                                        //window.Android.notify(window.Android.translate("import_download_start")+" "+dbs[lcnt0]);
                                                        var downloadedFile=window.Android.downloadFile(curl);
                                                        lcnt0+=1;
                                                });*/

                        disconnect(origin_url);
                        return;
                    }

                    if(!$(myData).find("wps\\:ProcessSucceeded").length){
                        if(MM4ME_DEBUG){
                            console.log(data["documentElement"]["outerHTML"]);
                            console.log($(myData).find("wps\\:ProcessStarted").attr("percentCompleted"));
                        }
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
        window.Android.keepScreenOn();
        window.Android.refreshDbs();
        var curl=url+"?service=WPS&version=1.0.0&request=Execute&Identifier=mm4me.createSqliteDB4ME&DataInputs=tileId="+cid+"&ResponseDocument=Result@asReference=true;Result1@asReference=true;Result2@asReference=true;Result3@asReference=true&storeExecuteResponse=true&status=true";
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
                        var regId=new RegExp("\\[TITLE\\]","g");
                        var reg1Id=new RegExp("\\[RUN\\]","g");
                        var reg2Id=new RegExp("\\[CANCEL\\]","g");
                        ldata=ldata.replace(regId,window.Android.translate("offline_map"))
                                   .replace(reg1Id,window.Android.translate("run"))
                                   .replace(reg2Id,window.Android.translate("cancel"));
                        $("body").append(ldata);
                        //$(".modal-header").first().find("h4").html(""+window.Android.translate("offline_map"));
                        var regId=new RegExp("\\[VALUE\\]","g");
                        var regName=new RegExp("\\[NAME\\]","g");
                        var regSize=new RegExp("\\[SIZE\\]","g");
                        $("#extentList").html($("#extentListItem_template")[0].innerHTML.replace(regId,-1).replace(regName,window.Android.translate("use_current_tiles")).replace(regSize,"0Mb"));
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
                        chooseId=-1;
                        console.log(JSON.stringify(data));
                        createSqliteDB4ME(elem,url,-1);
                        console.log(JSON.stringify(data));
                    }
                });

            },
            error: function(data){
                console.log("ERROR");
                chooseId=0;
                console.log(JSON.stringify(data));
                createSqliteDB4ME(elem,url,0);
                console.log(JSON.stringify(data));
            }
        });
    }
});