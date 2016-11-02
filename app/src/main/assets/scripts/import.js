    $(function(){
        if(MM4ME_DEBUG)
            console.log('run');

        updateBreadcrumbs(["home","mm_import"]);

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
                },
                error: function(){
                    alert("error !");
                }
            });
            return;
        }

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
                        authenticate(closure["url"],closure["login"],closure["password"],function(){createSqliteDB4ME(closure1,closure["url"]);});
                    }
                };
                $(".media-list").find("button").last().click(cmd(list[i]));
        }

        function ping(myRoot,url,origin_url){
            $.ajax({
                method: "GET",
                url: url,
                dataType: "xml",
                success: function(data){
                    try{
                    if($(data).find("ExceptionText").length){
                        myRoot.parent().append('<div class="alert alert-danger">'+$(data).find("ExceptionText").text()+'</div>');
                        if(MM4ME_DEBUG)
                            console.log("error should be displayed: "+$(data).find("ExceptionText").text());
                        return false;
                    }
                    if($(data).find("ProcessSucceeded").length){
                        if(MM4ME_DEBUG)
                            console.log('SUCCESS!');
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
                        myRoot.find('.progress-bar').css("width","100%").attr('aria-valuenow', 100).html("100%");
                        var curl=$(data).find("Reference").attr("href");
                        if(MM4ME_DEBUG)
                            console.log(curl);
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_start"));
                        var downloadedFile=window.Android.downloadFile(curl);
                        myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_download_end")+" "+downloadedFile);
                        if(MM4ME_DEBUG)
                            console.log(downloadedFile);
                        if(window.Android.copyFile(downloadedFile,"local.db"))
                            myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_success"));
                        else
                            myRoot.find('.progress-bar').parent().next().html(window.Android.translate("import_failure"));
                        if(MM4ME_DEBUG){
                            console.log("UPDATE mm4me_servers set last_import=strftime('%s','now') WHERE url='"+origin_url+"'");
                            console.log(window.Android.executeQueryFromDb("servers.db","UPDATE mm4me_servers set last_import=strftime('%s','now') WHERE url='"+origin_url+"'",[],[]));
                        }
                        return;
                    }
                    if(!$(data).find("ProcessAccepted").length){
                        var percentCompleted=parseInt($(data).find("ProcessStarted").attr("percentCompleted"));
                        if(MM4ME_DEBUG)
                            console.log(percentCompleted);
                        myRoot.find('.progress-bar').css("width",percentCompleted+"%").attr('aria-valuenow', percentCompleted).html(percentCompleted+"%");
                        myRoot.find('.progress-bar').parent().next().html($(data).find("ProcessStarted").text());
                        if(percentCompleted<100)
                            setTimeout(function() { ping(myRoot, url,origin_url); }, 2000);
                    }else
                        setTimeout(function() { ping(myRoot, url,origin_url); }, 2000);
                        if(MM4ME_DEBUG)
                            console.log("timeout set");
                    }catch(e){
                        alert(e);
                    }
                },
                error: function(){
                    window.Android.showToast("PING FAILED !");
                }
            });
        }

        function createSqliteDB4ME(elem,url){
            var curl=url+"?service=WPS&version=1.0.0&request=Execute&Identifier=mm4me.createSqliteDB4ME&DataInputs=&ResponseDocument=Result@asReference=true&storeExecuteResponse=true&status=true";
            $.ajax({
                method: "GET",
                url: curl,
                dataType: "xml",
                success: function(data){
                    if(MM4ME_DEBUG)
                        console.log(data);
                    var statusLocation=$(data).find("ExecuteResponse").attr("statusLocation");
                    if(MM4ME_DEBUG)
                        console.log(statusLocation);
                    ping(elem.parent().parent(),statusLocation,url);
                    disconnect(url);
                },
                error: function(){
                    alert("error !");
                }
            });
        }

        function authenticate(url,login,passwd,func){
            var curl=url+"?service=WPS&request=Execute&version=1.0.0&Identifier=authenticate.clogIn&DataInputs=login="+login+";password="+passwd+"&RawDataOutput=Result";
            if(MM4ME_DEBUG)
                console.log(curl);
            $.ajax({
                method: "GET",
                url: curl,
                success: function(data){
                    if(MM4ME_DEBUG)
                        console.log(data);
                    if(func)
                        func();
                },
                error: function(){
                    if(MM4ME_DEBUG)
                        console.log("unable to login!");
                    disconnect(url);
                    var hasBeenShown=false;
                    var xml=arguments[0].responseText;
                    $(xml).find("ows\\:ExceptionText").each(function(){
                        window.Android.showToast($(this).text());
                        hasBeenShown=true;
                    });
                    if(!hasBeenShown){
                        /*closure.parent().parent().parent().append('<div class="alert alert-danger alert-dismissible" role="alert">'+
                            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
                            '<strong>Error!</strong> '+arguments[0].responseText+
                            '</div>');*/
                        window.Android.showToast(arguments[0].responseText);
                    }

                }
            });
        }

        function disconnect(url){
            var curl=url+"?service=WPS&request=Execute&version=1.0.0&Identifier=authenticate.clogOut&DataInputs=&RawDataOutput=Result";
            $.ajax({
                method: "GET",
                url: curl,
                success: function(data){
                    if(MM4ME_DEBUG){
                        console.log(data);
                        console.log("** Your are no more connected!");
                    }
                },
                error: function(){
                    if(MM4ME_DEBUG){
                        console.log(curl);
                        console.log("unable to disconnect!");
                    }
                }
            });
        }

    });