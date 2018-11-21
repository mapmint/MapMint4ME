$(function(){
    console.log('run');

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
    for(var i=0;i<list.length;i++){
        $(".media-list").append($("#servers_list_template")[0].innerHTML.
                                replace(regs[1],list[i]["id"]).
                                replace(regs[0],list[i]["name"]).
                                replace(regs[2],(list[i]["localtime"]!=''?list[i]["localtime"]:window.Android.translate("export_never"))));
        var cmd=function(a){
            var closure=a;
            return function(){
                var closure1=$(this);
                var body=function(){
                    console.log(closure["url"]);
                    var curl=closure["url"]+"?request=Execute&service=wps&version=1.0.0&Identifier=upload.saveOnServer&DataInputs=file=upload";
                    closure1.parent().parent().find('.progress-bar').parent().next().html(window.Android.translate("upload_start"));
                    var e;
                    window.Android.showToast(window.Android.translate("upload_start"));
                    if(e=window.Android.uploadFile(curl,"file","local.db")){
                        console.log(closure["url"]);
                        replaySqliteHistory(closure1,closure["url"]);
                    }else
                        alert('error Upload!'+window.Android.getErrorMsg())
                };
                authenticate(closure["url"],closure["login"],closure["password"],body);
            }
        };
        $(".media-list").find("button").last().click(cmd(list[i]));
    }

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
                alert("error ping!");
            }
        });
    }

    // Invoke the mm4me.replaySqliteHistory WPS service
    function replaySqliteHistory(elem,url){
        var curl=url+"?service=WPS&version=1.0.0&request=Execute&Identifier=mm4me.replaySqliteHistory&DataInputs=&ResponseDocument=Result@asReference=true;Log@asReference=true&storeExecuteResponse=true&status=true";
        if(MM4ME_DEBUG)
            console.log(curl);
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
                //disconnect(url);
            },
            error: function(){
                alert("error replaySqliteHistory!");
            }
        });
    }


});