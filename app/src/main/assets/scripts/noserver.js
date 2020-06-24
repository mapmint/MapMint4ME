var runOnce=true;
$(function(){
   if(!runOnce)
        return;
    $("p").first().html(window.Android.translate("noserver_intro_p"));
    $(".btn-success").first().html(window.Android.translate("noserver_btn"));
});
