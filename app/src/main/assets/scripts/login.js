$(function(){
    $("h2").first().append(window.Android.translate("new_server"));
    $("#inputServer").attr("placeholder",window.Android.translate("server_name"));
    $("#inputUrl").attr("placeholder",window.Android.translate("server_url"));
    $("#inputLogin").attr("placeholder",window.Android.translate("server_login"));
    $("#inputPassword").attr("placeholder",window.Android.translate("server_password"));
    $('.btn').first().html(window.Android.translate("server_add"));
    $('.btn').last().find('a').first().html(window.Android.translate("cancel"));
    if($(location).attr('href').indexOf("?")>=0){
        console.log(" -*- loaded from URL!");
        var tmp=$(location).attr("href").split('=')[1];
        console.log(tmp);
        var fields=decodeURIComponent(tmp).split("/");
        $("#inputServer").val(fields[4]);
        $("#inputUrl").val(fields[0]+"//"+fields[2]+"/cgi-bin/mm/zoo_loader.cgi");
        $("#inputLogin").val(fields[5]);
    }
    $(".form-signin").find("button").first().click(function(){
            $(this).append(' <i class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></i>');
            var url=$("#inputUrl").val()+"?service=WPS&request=Execute&version=1.0.0&Identifier=authenticate.clogIn&DataInputs=login="+$("#inputLogin").val()+";password="+$("#inputPassword").val()+"&RawDataOutput=Result";
            console.log(url);
            var closure=$(this);
            $.ajax({
                method: "GET",
                url: url,
                success: function(data){
                    window.Android.executeQueryFromDb("servers.db","INSERT INTO mm4me_servers (name,url,login,password) values (?,?,?,?)",[$("#inputServer").val(),$("#inputUrl").val(),$("#inputLogin").val(),$("#inputPassword").val()],[1,1,1,1]);
                    disconnect($("#inputUrl").val(),function(){
                        document.location="file:///android_asset/import.html";
                    });

                },
                error: function(){
                    var hasBeenShown=false;
                    var xml=arguments[0].responseText;
                    $(xml).find("ows\\:ExceptionText").each(function(){
                        closure.parent().parent().parent().append('<div class="alert alert-danger alert-dismissible" role="alert">'+
                          '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
                          '<strong>Error!</strong> '+$(this).text()+
                          '</div>');
                        hasBeenShown=true;
                    });
                    if(!hasBeenShown){
                        closure.parent().parent().parent().append('<div class="alert alert-danger alert-dismissible" role="alert">'+
                            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'+
                            '<strong>Error!</strong> '+arguments[0].responseText+
                            '</div>');
                    }
                    console.log(JSON.stringify(arguments[0]));
                    closure.children().last().remove();
                }
            });
    });
});