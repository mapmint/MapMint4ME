$(".mm4me_listing").hide();
var runOnce=true;
$(function(){
   if(!runOnce)
        return;
    runOnce=false;
    updateBreadcrumbs(["home","edit"]);
    $(".mm4me_content").find("p").first().html(window.Android.translate("views_header"));
    displayTablesTree(listEdit);
});