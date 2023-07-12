var runOnce=true;

$(function(){
    console.log('run');
    if(!runOnce)
        return;
    runOnce=false;

    updateBreadcrumbs(["home","export"]);
    addStatusControl();
    getCurrentStatus();

    $(".mm4me_content").find("p").first().html(window.Android.translate("export_intro_p"));

    // Retrieve number of configured servers
    var list=JSON.parse(window.Android.displayTableFromDb("servers.db","SELECT count(*) as a FROM mm4me_servers",[]));
    if(list[0]["a"]==0){
        $.ajax({
            method: "GET",
            url: 'content/noserver.html',
            success: function(data){
                console.log('Display warning message on the UI !');
                $(".mm4me_content").html(data);
            },
            error: function(){
                alert("error fetching noserver.html!");
            }
        });
        return;
    }


    // Retrieve every servers with the last_export datetime
    var list=JSON.parse(window.Android.displayTableFromDb("servers.db","SELECT datetime(last_export, 'unixepoch', 'localtime') as localtime, * FROM mm4me_servers",[]));
    var regs=[
        new RegExp("\\[title\\]","g"),
        new RegExp("\\[id\\]","g"),
        new RegExp("\\[time\\]","g")
    ];
    for(var i=0;i<list.length;i++)
        if(list[i]["url"]==localStorage.getItem("lastServer")){
        $(".media-list").append($("#servers_list_template")[0].innerHTML.
                                replace(regs[1],list[i]["id"]).
                                replace(regs[0],list[i]["name"]).
                                replace(regs[2],(list[i]["localtime"]!=''?list[i]["localtime"]:window.Android.translate("export_never"))));
        var cmd=function(a){
            var closure=a;
            return function(){
                var curl=closure["url"]+"?service=WPS&version=1.0.0&request=DescribeProcess&Identifier=np.join";
                var closure1=$(this);
                var body=function(){
                    mainClosure=closure;
                    mainClosure1=closure1;
                    closure1.prop("disabled",true);
                    console.log(closure["url"]);
                    nbParts = window.Android.SplitFile("local.db");
                    console.log("nbParts: "+nbParts);
                    window.Android.showToast(window.Android.translate("upload_start"));
                    ucnt=0;
                    for(var i=0;i<nbParts;i++){
                        console.log("Step "+i);
                        //window.Android.showToast("part"+i+"_local.db");
                        //setTimeout(function(){
                        function calliFunction(i){
                            var t=nbParts;
                            var curl=closure["url"]+"?request=Execute&service=wps&version=1.0.0&Identifier=upload.saveOnServer&DataInputs=file=upload";
                            //setTimeout(function(){closure1.parent().parent().find('.progress-bar').parent().next().html("part"+i+"_local.db");closure1.parent().parent().find('.progress-bar').parent().next().html("part"+i+"_local.db");},1);
                            var e;
                            console.log(curl);
                            try{
                                if(e=window.Android.uploadFile(curl,"file","part"+i+"_local.db")){
                                    console.log(closure["url"]);
                                    //replaySqliteHistory(closure1,closure["url"]);
                                }else{
                                    window.Android.showToast('Failure for:'+window.Android.getErrorMsg());
                                    calliFunction(i);
                                }
                            }catch(e){
                                window.Android.showToast(e);
                                calliFunction(i);
                            }
                        };
                        calliFunction(i);
                        //closure1.parent().parent().find('.progress-bar').css("width",Math.round((i*100)/t)+"%").attr('aria-valuenow', Math.round((i*100)/t)).html(Math.round((i*100)/t)+"%");
                        var tmp=window.Android.translate("upload_start")+" ("+(i+1)+" / "+nbParts+")";
                        setTimeout(function() {
                            closure1.parent().parent().find('.progress-bar').css("width",Math.round((i*100)/nbParts)+"%").attr('aria-valuenow', Math.round((i*100)/nbParts)).html(Math.round((i*100)/nbParts)+"%");
                            closure1.parent().parent().find('.progress-bar').parent().next().html(tmp);
                            closure1.parent().parent().parent().click();
                        }, 100);
                        //},1000);})(i);
                    }
                    console.log("UPLOAD COMPLETE!");
                    //window.Android.showToast(window.Android.translate("upload_end"));
                };
                var body1=function(){
                    mainClosure=closure;
                    mainClosure1=closure1;
                    closure1.prop("disabled",true);
                    console.log(closure["url"]);
                    var curl=closure["url"]+"?request=Execute&service=wps&version=1.0.0&Identifier=upload.saveOnServer&DataInputs=file=upload";
                    nbParts=0;
                    setTimeout(function(){closure1.parent().parent().find('.progress-bar').parent().next().html(window.Android.translate("upload_start"));},100);
                    var e;
                    window.Android.showToast(window.Android.translate("upload_start"));
                    console.log(curl);
                    if(e=window.Android.uploadFile(curl,"file","local.db")){
                        console.log(closure["url"]);
                        //replaySqliteHistory(closure1,closure["url"]);
                    }else
                        alert('error Upload!'+window.Android.getErrorMsg())
                };
                $.ajax({
                    method: "GET",
                    url: curl,
                    dataType: "xml",
                    success: function(ldata){
                        console.log(ldata);
                        doModal(window.Android.translate('upload_options'),'<div>'+window.Android.translate("upload_db_size")+' '+window.Android.getSizeOfFile("local.db")+'MB</div><div><input type="checkbox" /> '+window.Android.translate("upload_chunk")+'</div>');
                        $("#dynamicModal").find(".btn-success").last().click(function(){
                            if($("#dynamicModal").find("input[type=checkbox]").is(':checked')){
                                authenticate(closure["url"],closure["login"],closure["password"],body);
                            }else{
                                authenticate(closure["url"],closure["login"],closure["password"],body1);
                            }
                        });
                    },
                    error: function(data){
                        console.log(data);
                        authenticate(closure["url"],closure["login"],closure["password"],body1);
                    }
                });

            }
        };
        $(".media-list").find("button").last().click(cmd(list[i]));
    }

});


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
    html += '<span class="btn btn-success" data-dismiss="modal"><i class="glyphicon glyphicon-ok"></i> '+window.Android.translate("run")+'</span>';
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

    var pingNbErrors=0;
    // Update the ongoing status using GetStatus URL
    function ping(myRoot,url,origin_url){
        $.ajax({
            method: "GET",
            url: url,
            dataType: "xml",
            success: function(){
                data=arguments[2].responseText;
                if($(data).find("ows\\:ExceptionText").length){
                    myRoot.parent().append('<div class="alert alert-danger">'+$(data).find("ows\\:ExceptionText").text()+'</div>');
                    console.log("error should be displayed: "+$(data).find("ows\\:ExceptionText").text());
                    disconnect(url);
                    return false;
                }
                if($(data).find("wps\\:ProcessSucceeded").length){
                    console.log('SUCCESS!');
                    myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
                    myRoot.find('.progress-bar').css("width","100%").attr('aria-valuenow', 100).html("100%");
                    var curl=$(data).find("wps\\:Reference").first().attr("href");
                    console.log(curl);
                    myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start"));
                    var tmp=curl.split("/");
                    console.log(window.Android.executeQueryFromDb("servers.db","UPDATE mm4me_servers set last_export=strftime('%s','now'), export_id='%' WHERE url='"+origin_url+"'",[],[]));
                    $.ajax({
                        method: "GET",
                        url: curl,
                        success: function(data){
                            var sqlQueries=JSON.parse(data);
                            for(var i=0;i<sqlQueries.length;i++){
                                window.Android.executeQuery(sqlQueries[i],[],[]);
                            }
                            myRoot.find('.progress-bar').parent().next().html(window.Android.translate("export_success"));
                            disconnect(url);
                        },
                        error: function(){
                            alert("error "+curl+"!");
                        }
                    });
                    mainClosure1.prop("disabled",false);
                    return;
                }
                if(!$(data).find("wps\\:ProcessAccepted").length){
                    var percentCompleted=parseInt($(data).find("wps\\:ProcessStarted").attr("percentCompleted"));
                    console.log(percentCompleted);
                    myRoot.find('.progress-bar').css("width",percentCompleted+"%").attr('aria-valuenow', percentCompleted).html(percentCompleted+"%");
                    myRoot.find('.progress-bar').parent().next().html($(data).find("wps\\:ProcessStarted").text());
                    if(percentCompleted<100)
                        setTimeout(function() { ping(myRoot, url, origin_url); }, 2000);
                }else
                    setTimeout(function() { ping(myRoot, url, origin_url); }, 2000);
                console.log("timeout set");
            },
            error: function(){
                alert("Error ping ! Close this window to retry after 4 seconds.");
                if(pingNbErrors<10){
                    setTimeout(function() { ping(myRoot, url, origin_url); }, 2000);
                    pingNbErrors+=1;
                }else
                    mainClosure1.prop("disabled",false);
            }
        });
    }
    // Invoke the mm4me.replaySqliteHistory WPS service
    function replaySqliteHistory(elem,url){
        //var curl=url+"?service=WPS&version=1.0.0&request=Execute&Identifier=mm4me.replaySqliteHistory&DataInputs=&ResponseDocument=Result@asReference=true;Log@asReference=true&storeExecuteResponse=true&status=true";
        var curl=url+"?service=WPS&version=1.0.0&request=Execute&Identifier=mm4me.replaySqliteHistory&DataInputs=&storeExecuteResponse=true&status=true";
        if(MM4ME_DEBUG)
            console.log(curl);
        var myResult=window.Android.runRequestAuth(curl);
        if(myResult!=null){
            var data=$.parseXML(myResult);
            var statusLocation=$(data["documentElement"]["outerHTML"]).attr("statusLocation")||$(data["documentElement"]).attr("statusLocation");
                            if(MM4ME_DEBUG)
                                console.log(statusLocation);
                            ping(elem.parent().parent(),statusLocation,url);
                            disconnect(url);
        }else{
            alert("error replaySqliteHistory!");
            mainClosure1.prop("disabled",false);
        }
        /*
        $.ajax({
            method: "GET",
            url: curl,
            dataType: "xml",
            success: function(data){
                //console.log(data);
                var statusLocation=$(data["documentElement"]["outerHTML"]).attr("statusLocation")||$(data["documentElement"]).attr("statusLocation");
                if(MM4ME_DEBUG)
                    console.log(statusLocation);
                ping(elem.parent().parent(),statusLocation,url);
                disconnect(url);
            },
            error: function(){
                alert("error replaySqliteHistory!");
                mainClosure1.prop("disabled",false);
            }
        });
        */
    }

var nbParts=0;
var ucnt=0;
var mainClosure=null;
var mainClosure1=null;
    function postUpload(){
        ucnt++;
        var lnb=nbParts==0?1:nbParts;
        var tmp=window.Android.translate("upload_start")+" ("+(ucnt)+" / "+lnb+")";
        var i=ucnt;
        //setTimeout(function() {
        mainClosure1.parent().parent().find('.progress-bar').css("width",Math.round((i*100)/lnb)+"%").attr('aria-valuenow', Math.round((i*100)/lnb)).html(Math.round((i*100)/lnb)+"%");
        mainClosure1.parent().parent().find('.progress-bar').parent().next().html(tmp);
        mainClosure1.parent().parent().parent().click();
         //}, 100);
        if(nbParts>0){
            if(ucnt==nbParts){
                var curl=mainClosure["url"]+"?request=Execute&service=WPS&version=1.0.0&Identifier=mm4me.joinFiles&RawDataOutput=Result&DataInputs=nb="+nbParts;
                $.ajax({
                    method: "GET",
                    url: curl,
                    success: function(data){
                        replaySqliteHistory(mainClosure1,mainClosure["url"]);
                    },
                    error: function(){
                        alert(window.Android.translate("error_joinFiles"));
                        disconnect(mainClosure["url"]);
                        mainClosure1.prop("disabled",false);
                    }
                });
            }
        }else{
            replaySqliteHistory(mainClosure1,mainClosure["url"]);
        }
    }