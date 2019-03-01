var MM4ME_DEBUG=true;
var EDITION_TYPE_FILE=5;
var mainTable={};
var mtable=null;
var refTables={};
var tblId=null;
var allTables={};
var editSchema={};
var referenceIds={};
var lastEdition={};
var tblName=null;
var toRunOnLoad={};
var valuesOnLoad=[];
var definedSqlTypes=[];
var changingFields=[];
var lang=window.Android.getLang();
var langUrl=null;
if(lang=="fr"){
    langUrl="file:///android_asset/localisation/French.json";
}


function loadWelcome(){
    $.ajax({
        method: "GET",
        url: "./content/welcome.html",
        success: function(ldata){
            $("body").html(ldata);
            $("body").css("margin","0");
            $("body").css("padding","0");
            //$('#myCarousel').css("height",($(window).height()-50)+"px");
            //$("#myCarousel").css("margin","0");
            $('.item').css("background-color","#333");
            $('.carousel-caption').css("color","#fff");
            $('.item').css("height",($(window).height())+"px");
        }
    });
}

/*****************************************************************************
 * Update status icon color depending on network and GPS availability
 *****************************************************************************/
function updateStatus(gps,internet){
    if(internet){
        $('.glyphicon-signal').css('color','#00EE00');
    }else
        $('.glyphicon-signal').css('color','#EE0000');
    $('#gpsMenu1').next().html("");
    if(gps.length==0){
        $('#gpsMenu1').css('color','#EE0000');
        $('#gpsMenu1').next().html('<li > <i class="glyphicon glyphicon-remove" style="color: #EE0000"></i> '+window.Android.translate("no_gps")+'</li>');
    }else{
        $('#gpsMenu1').css('color','#00EE00');
        for(var i=0;i<gps.length;i++)
            $('#gpsMenu1').next().append('<li> <i class="glyphicon glyphicon-ok" style="color: #'+(gps[i].source=="GPS"?"298836":gps[i].source=="Network"?"5bb04b":"81d071")+'"></i> '+gps[i].source+'</li>');
    }
}

/*****************************************************************************
 * List all available table for a given theme
 *****************************************************************************/
function fetchTableForTheme(obj,id){
    var hasTable=false;
    var tables=JSON.parse(window.Android.displayTable(
        "SELECT mm4me_tables.id as tid,mm4me_views.id as id,"+
            "mm4me_tables.name as name, "+
            "mm4me_tables.description, "+
            "mm4me_views.name as title "+
            " from mm4me_tables,mm4me_views"+
            " where mm4me_tables.id=mm4me_views.ptid "+
                "and mm4me_views.visible "+
                "and mm4me_views.id in (select vid from mm4me_views_themes where tid="+id+")",[]));
    for(var i=0;i<tables.length;i++){
        if(!obj["nodes"])
            obj["nodes"]=[];
        var list1=JSON.parse(window.Android.displayTable("SELECT count(*) as nb from "+cleanupTableName(tables[i]["name"]),[]));
        obj["nodes"].push({
            "myId":tables[i]["id"],
            "myName":tables[i]["name"],
            "myTitle":tables[i]["title"],
            "icon": "glyphicon glyphicon-list",
            "text": tables[i]["title"],
            "selectable": true,
            "tags": [ ""+list1[0]["nb"] ]
        });
        hasTable=true;
    }
    return tables.length>0;
}

/*****************************************************************************
 * Create a JSON Object containing the themes hierarchy
 *****************************************************************************/
function fetchThemes(obj,id){
    var cthemes=JSON.parse(window.Android.displayTable("SELECT id,name FROM mm4me_themes where pid = "+id,[]));
    for(var i=0;i<cthemes.length;i++){
        if(!obj["nodes"])
            obj["nodes"]=[];
        obj["nodes"].push({text: cthemes[i]["name"]});
        fetchThemes(obj["nodes"][obj["nodes"].length-1],cthemes[i]["id"]);
        fetchTableForTheme(obj["nodes"][obj["nodes"].length-1],cthemes[i]["id"]);
    }
}

/*****************************************************************************
 * Display the tables tree and handle accessing the edition / view page
 *****************************************************************************/
function displayTablesTree(func){
    try{
        var themes_0=JSON.parse(window.Android.displayTable("SELECT id,name FROM mm4me_themes where pid is null",[]));
        var allThemes=[];
        for(var i=0;i<themes_0.length;i++){
            allThemes.push({text: themes_0[i]["name"]});
            fetchThemes(allThemes[allThemes.length-1],themes_0[i]["id"]);
            var hasTable=fetchTableForTheme(allThemes[allThemes.length-1],themes_0[i]["id"]);
            if(!hasTable){
                console.log("should remove!");
                allThemes.pop(allThemes[allThemes.length-1]);
            }
        }
        $(".mm4me_content").append('<div id="tree"></div>');
        $('#tree').treeview({
            data: allThemes,
            onNodeSelected: function(event, data) {
                if(data["myId"]){
                    try{
                        func(data["myId"],data["myName"],data["myTitle"],true);
                    }catch(e){
                        console.log(JSON.stringify(data));
                        console.log(e);
                        window.Android.showToast(e);
                        //exit();
                    }
                }
                else{
                    $('#tree').treeview('toggleNodeExpanded',[$("#tree").treeview('getSelected')[0], { silent: true }]);
                    $('#tree').treeview('toggleNodeSelected',[$("#tree").treeview('getSelected')[0], { silent: true }]);
                    //console.log(JSON.stringify(data));
                    //$(this).open();
                }
            },
            showTags: true
        });
        var list=JSON.parse(window.Android.displayTable("SELECT mm4me_tables.id as tid,mm4me_views.id as id,mm4me_tables.name as name,mm4me_tables.description,mm4me_views.name as title from mm4me_tables,mm4me_views where mm4me_tables.id=mm4me_views.ptid and mm4me_views.visible",[]));
        var tableList=list;
        var total=0;
        contents=[];
        for(var i in list){
            mainTable[list[i]["id"]]=list[i]["tid"];
        }
    }
    catch(e){
        console.log(e);
        displayNoListing();
    }
}

/*****************************************************************************
 * Update the breadcrumbs text to translated string
 *****************************************************************************/
function updateBreadcrumbs(breadcrumbs){
        //var breadcrumbs=["home","view"];
        var lcnt0=0;
        $('.breadcrumb').find("a").each(function(){
            $(this).append(window.Android.translate(breadcrumbs[lcnt0]));
            lcnt0+=1;
        });
        $('.breadcrumb').find("li").last().each(function(){
            $(this).append(window.Android.translate(breadcrumbs[lcnt0]));
            lcnt0+=1;
        });
}

/*****************************************************************************
 * Convert table names in a string from the PostgreSQL to our SQLite format.
 * So, convert "AAAXXX.YYYBBB" to "AAAXXX_YYYBBB"
 *****************************************************************************/
function cleanupTableName(name){
    return name.replace(/(\w+)(\d*)\.(\d*)(\w+)/g,"$1$2_$3$4");
}

/*****************************************************************************
 * Display an HTML part containing the image produced by Camera or picked from
 * the photo library.
 *****************************************************************************/
function loadNewPicture(cid,id,picture){
    $(".tab-pane").each(function(){
        if($(this).is(":visible"))
         $(this).find("#value_"+id)
                .html('<pre>'+picture+'</pre><img class="img-responsive" src="'+picture+'" title="'+
                        window.Android.translate('image')+'" width="100%" />');
    });
}


/*****************************************************************************
 * Create a JSON Object representing the dependency values.
 *****************************************************************************/
function fetchDependencies(obj,cid,changingField){
    var list1=null;
    //console.log(cid+" "+JSON.stringify(obj));

    for(var key in changingField){
        for(var i=0;i<changingField[key]["dep"].length;i++){
            for(var ckey in changingField[key]["dep"][i]){
                var req="select * from mm4me_edition_fields where mm4me_edition_fields.edition>0 and name='"+ckey+"' and eid="+obj["eid"]+" order by mm4me_edition_fields.id asc";
                list1=JSON.parse(window.Android.displayTable(req,[]));
                changingField[key]["dep"][i][ckey]["values"]=[];
                if(list1.length==0)
                    return;
                changingField[key]["dep"][i][ckey]["id"]=list1[0]["id"];
                for(var j=0;j<changingField[key]["dep"][i][ckey]["options"].length;j++){
                    var creq=list1[0]["value"];
                    if(creq.toLowerCase().indexOf("WHERE ")<0){
                        creq=creq.replace(/order by/,"WHERE "+
                               changingField[key]["dep"][i][ckey]["tfield"]+
                               changingField[key]["dep"][i][ckey]["operator"]+
                               changingField[key]["dep"][i][ckey]["options"][j]+
                               " order by ");
                    }
                    list0=JSON.parse(window.Android.displayTable(cleanupTableName(creq),[]));
                    changingField[key]["dep"][i][ckey]["values"].push(list0);
                }
            }

        }
    }
    console.log(cid+" "+JSON.stringify(changingField));
}

var View_template=null;
var currentTypes=[];

/*****************************************************************************
 * Display an HTML part containing the input corresponding to a given type.
 *****************************************************************************/
function printCurrentType(obj,cid){
    if(definedSqlTypes.length==0){
        definedSqlTypes=JSON.parse(window.Android.displayTable("select id,code from mm4me_ftypes where ftype='e' order by name",[]));
    }

    for(var i in definedSqlTypes){
        if(definedSqlTypes[i]["id"]==obj["ftype"]){
            //console.log(JSON.stringify(definedSqlTypes[i]));
            if(definedSqlTypes[i]["code"]=="bytea"){
                var tmpStr="";
                var res='<input type="checkbox" id="'+obj["id"]+'_display" onchange="if($(this).is(\':checked\')) {$(this).prev().css(\'color\',\'#83C849\');$(this).next().show();$(this).next().next().show();}else {$(this).prev().css(\'color\',\'#ff0000\');$(this).next().hide();$(this).next().next().hide();}"/>';
                tmpStr+=res+
                        '<div class="dropdown">'+
                        '   <button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">'+
                        '      '+ window.Android.translate("file_create") +
                        '     <span class="caret"></span>'+
                        '   </button>'+
                        '   <ul class="dropdown-menu" aria-labelledby="dropdownMenu1">'+
                        //'     <li><a href="#" onclick="var tmp=window.Android.getGPS();alert(tmp.lat+'+"' '"+'+tmp.lon);"><i class="glyphicon glyphicon-pencil"></i></a></li>'+
                        '     <li><a href="#"  onclick="window.Android.pickupImage('+obj["id"]+','+cid+');"><i class="glyphicon glyphicon-picture"></i> '+window.Android.translate("choose_picture")+'</a></li>'+
                        '     <li role="separator" class="divider"></li>'+
                        '     <li><a href="#" onclick="window.Android.queryCamera('+obj["id"]+','+cid+');"><i class="glyphicon glyphicon-camera"></i> '+window.Android.translate("take_picture")+'</a></li>'+
                        '   </ul>'+
                        '</div> <div id="value_'+obj["id"]+'"></div><script>currentTypes.push(\''+obj["id"]+'_display\');</script>';
                console.log(tmpStr);
                return tmpStr;
            }
            if(definedSqlTypes[i]["code"]=="geometry"){
                console.log("CID: "+cid+" select type from mm4me_gc where f_table_schema||'_'||f_table_name = (select name from mm4me_tables where id="+cid+") ")
                var geoType=getGeometryType("(select replace(name,'.','_') from mm4me_tables where id="+cid+")");
                var viewb='<button id="field_'+obj["id"]+'_map" style="display:none" class="btn btn-default" href="#" onclick=""><i class="glyphicon glyphicon-globe"></i> '+window.Android.translate("view_on_map")+'</button>';
                var res='<script>currentTypes.push(\''+obj["id"]+'_display\');</script> <input type="checkbox" id="'+obj["id"]+'_display" onchange="if($(this).is(\':checked\')) {$(this).next().show();$(this).next().next().show();}else {$(this).next().hide();$(this).next().next().hide();}"/>';
                if(geoType=='POINT' || geoType=='MULTIPOINT' )
                return res+'<button class="btn btn-default" href="#" onclick="requireGPSPosition(\'field_'+obj["id"]+'\');" id="btn_field_'+obj["id"]+'"><i class="glyphicon glyphicon-map-marker"></i> '+window.Android.translate("use_gps")+'</button>'+
                    '<div><input type="hidden" name="field_'+obj["id"]+'" value="" data-optional="true" /><h4>GPS Informations</h4><h5>Type <span class="btn_field_'+obj["id"]+'_source"></span></h5><h5>Coords</h5><h5 class="btn_field_'+obj["id"]+'_long"></h5><h5 class="btn_field_'+obj["id"]+'_lat"></h5></div>';
                else if(geoType=='LINESTRING' || geoType=='MULTILINESTRING' )
                return res+'<button class="btn btn-default" href="#" onclick="trackGPSPosition(\'field_'+obj["id"]+'\',\'line\');" id="btn_field_'+obj["id"]+'"><i class="glyphicon glyphicon-map-marker"></i> '+window.Android.translate("drawl_gps")+'</button>'+
                    '<button class="btn btn-default" href="#" onclick="trackStepByStepPosition(\'field_'+obj["id"]+'\',\'line\');" id="btn_field_'+obj["id"]+'"><i class="glyphicon glyphicon-map-marker"></i> '+window.Android.translate("drawlm_gps")+'</button>'+
                    '<div><input type="hidden" name="field_'+obj["id"]+'" value="" data-optional="true" />'+viewb+'</div>';
                else if(geoType=='POLYGON' || geoType=='MULTIPOLYGON' )
                return res+'<button class="btn btn-default" href="#" onclick="trackGPSPosition(\'field_'+obj["id"]+'\',\'polygon\');" id="btn_field_'+obj["id"]+'"><i class="glyphicon glyphicon-map-marker"></i> '+window.Android.translate("drawp_gps")+'</button>'+
                    '<button class="btn btn-default" href="#" onclick="trackStepByStepPosition(\'field_'+obj["id"]+'\',\'polygon\');" id="btn_field_'+obj["id"]+'"><i class="glyphicon glyphicon-map-marker"></i> '+window.Android.translate("drawpm_gps")+'</button>'+
                    '<div><input type="hidden" name="field_'+obj["id"]+'" value="" data-optional="true" />'+viewb+'</div>';

            }
            if(definedSqlTypes[i]["code"]=="tbl_linked"){
                var tmp=obj["value"].split(';');
                //console.log(cleanupTableName('SELECT '+tmp[1]+' FROM '+tmp[2]+' WHERE '+tmp[0]+'='+tblName+'.id'));
                var refs=JSON.parse(window.Android.displayTable(cleanupTableName(tmp[3]),[]));
                var tmpStr='<select name="field_'+obj["id"]+'" class="form-control" multiple="multiple">';
                for(var j in refs){
                    var cnt=0;
                    tmpStr+="<option "
                    for(var k in refs[j]){
                        if(cnt==0)
                            tmpStr+='value="'+refs[j][k]+'">';
                        else
                        if(cnt==1)
                            tmpStr+=refs[j][k];
                        cnt+=1;
                    }
                    tmpStr+="</option>"
                }
                return tmpStr+"</select>";

            }
            if(definedSqlTypes[i]["code"]=="link"){
                    var strReturn;
                    if(!View_template)
                    $.ajax({
                        async: false,
                        method: "GET",
                        url: './content/view_template.html',
                        error: function(){
                            console.log("Nothing to run after");
                        },
                        success: function(data){
                            console.log("**** \n\n Load View Template");
                            View_template=data;
                            var tmp=obj["value"].split(";");
                            var refs=JSON.parse(window.Android.displayTable("SELECT mm4me_tables.id as tid,mm4me_views.id as id,mm4me_tables.name as name,mm4me_tables.description,mm4me_views.name as title from mm4me_tables,mm4me_views where mm4me_tables.name=\""+tmp[1]+"\" and mm4me_tables.id=mm4me_views.ptid",[]));
                            var reg=new RegExp("\\[id\\]","g");
                            if(!valuesOnLoad[cid])
                                valuesOnLoad[cid]=[];
                            if(refs!=""){
                            valuesOnLoad[cid].push(refs);
                            if(!toRunOnLoad[cid])
                                toRunOnLoad[cid]=[];
                            toRunOnLoad[cid].push(function(){
                                prefix="_"+arguments[0]["0"]["id"];
                                //if(!mainTable[arguments[0]["0"]["id"]])
                                //mainTable[arguments[0]["0"]["id"]]=arguments[0]["0"]["tid"];
                                //console.log(arguments[0]["0"]["tid"]+" "+arguments[0]["0"]["name"]+" "+arguments[0]["0"]["title"]);
                                listInnerTable(arguments[0]["0"]["tid"],arguments[0]["0"]["id"],arguments[0]["0"]["name"],arguments[0]["0"]["title"],false,prefix,tmp[0]+"="+arguments[1]["local_id"]);
                            });
                            refTables[refs["0"]["tid"]]={"oid":cid,"col":tmp[0],"vid":refs["0"]["id"],"name":refs["0"]["table"],"name":refs["0"]["title"]};
                            strReturn=data.replace(reg,refs["0"]["tid"]);
                            }
                        }
                    });
                    else{
                        var tmp=obj["value"].split(";");
                        var refs=JSON.parse(window.Android.displayTable("SELECT mm4me_tables.id as tid,mm4me_views.id as id,mm4me_tables.name as name,mm4me_tables.description,mm4me_views.name as title from mm4me_tables,mm4me_views where mm4me_tables.name=\""+tmp[1]+"\" and mm4me_tables.id=mm4me_views.ptid",[]));
                        var reg=new RegExp("\\[id\\]","g");
                        if(!valuesOnLoad[cid])
                            valuesOnLoad[cid]=[];
                        valuesOnLoad[cid].push(refs);
                        if(!toRunOnLoad[cid])
                            toRunOnLoad[cid]=[];
                        toRunOnLoad[cid].push(function(){
                            prefix="_"+arguments[0]["0"]["id"];
                            //if(!mainTable[arguments[0]["0"]["id"]])
                            //mainTable[arguments[0]["0"]["id"]]=arguments[0]["0"]["tid"];
                            //console.log(arguments[0]["0"]["tid"]+" "+arguments[0]["0"]["name"]+" "+arguments[0]["0"]["title"]);
                            listInnerTable(arguments[0]["0"]["tid"],arguments[0]["0"]["id"],arguments[0]["0"]["name"],arguments[0]["0"]["title"],false,prefix,tmp[0]+"="+arguments[1]["local_id"]);
                        });
                        refTables[refs["0"]["tid"]]={"oid":cid,"col":tmp[0],"vid":refs["0"]["id"],"name":refs["0"]["table"],"name":refs["0"]["title"]};
                        strReturn=View_template.replace(reg,refs["0"]["tid"]);

                    }
                    //console.log(strReturn);
                    return strReturn;
            }
            if(definedSqlTypes[i]["code"]=="ref"){
                var req=obj["value"];//.replace(/^\((\w+)\)$/g,"$1");
                if(req[0]=="(")
                    req="SELECT * FROM "+req;
                var refs=JSON.parse(window.Android.displayTable(cleanupTableName(req),[]));
                var tmpStr='<select name="field_'+obj["id"]+'" class="form-control">';
                var cvalues=[];
                for(var j=0;j<refs.length;j++){
                    var tmpStr2='';
                    var cnt=0;
                    tmpStr+="<option "
                    for(var k in refs[j]){
                        if(cnt==0){
                            tmpStr+='value="'+refs[j][k]+'">';
                            cvalues.push(refs[j][k]);
                        }
                        else
                        if(cnt==1)
                            tmpStr+=refs[j][k];
                        cnt+=1;
                    }
                    tmpStr+="</option>"
                }
                tmpStr+="</select>";

                if(obj["dependencies"])
                try{
                    var lobj={};
                    lobj[obj["id"]]={"dep":JSON.parse(obj["dependencies"])};
                    for(var jj=0;jj<lobj[obj["id"]]["dep"].length;jj++){
                        for(var kk in lobj[obj["id"]]["dep"][jj])
                            lobj[obj["id"]]["dep"][jj][kk]["options"]=cvalues;
                    }
                    changingFields.push(lobj);
                    var tmpCnt=changingFields.length-1;
                    setTimeout(function(){fetchDependencies(obj,cid,changingFields[tmpCnt])},1);
                }catch(e){
                    window.Android.showToast("  **** "+obj["name"]+" "+e);
                }
                return tmpStr;

            }
            if(definedSqlTypes[i]["code"].indexOf("varchar")>=0){
                return '<input class="form-control" type="text" value="'+obj["value"]+'" name="field_'+obj["id"]+'" />';
            }
            if(definedSqlTypes[i]["code"]=="html")
                return '<textarea class="swagEditor" name="field_'+obj["id"]+'">'+obj["value"]+'</textarea>';
            if(definedSqlTypes[i]["code"]=="text")
                return '<textarea class="form-control" name="field_'+obj["id"]+'">'+obj["value"]+'</textarea>';
            if(definedSqlTypes[i]["code"]=="boolean")
                return '<input type="checkbox" name="field_'+obj["id"]+'" />';
            if(definedSqlTypes[i]["code"]=="date" || definedSqlTypes[i]["code"]=="datetime")
                return '<input class="form-control" type="'+definedSqlTypes[i]["code"]+'" name="field_'+obj["id"]+'" />';
            if(definedSqlTypes[i]["code"]=="float")
                return '<input class="form-control" type="number" name="field_'+obj["id"]+'" />';
            return definedSqlTypes[i]["code"];
        }
    }
    return null;
}

function printOptionalCheckbox(obj,cid){
    if(definedSqlTypes.length==0){
        definedSqlTypes=JSON.parse(window.Android.displayTable("select id,code from mm4me_ftypes where ftype='e' order by name",[]));
    }

    var res=' <i class="glyphicon glyphicon-eye-close" onclick="if($(this).hasClass(\'glyphicon-eye-close\')) {$(this).parent().parent().next().show();$(this).removeClass(\'glyphicon-eye-close\').addClass(\'glyphicon-eye-open\');}else {$(this).parent().parent().next().hide();$(this).removeClass(\'glyphicon-eye-open\').addClass(\'glyphicon-eye-close\');}"></i> <input type="checkbox" id="'+obj["id"]+'_display" onchange="if($(this).is(\':checked\')) {$(this).parent().parent().next().show();}else {$(this).parent().parent().next().hide();}"/>';
    for(var i in definedSqlTypes){
        if(definedSqlTypes[i]["id"]==obj["ftype"]){
            if(definedSqlTypes[i]["code"]=="bytea"){
                var tmpStr="";
                return res;
            }
            else if(definedSqlTypes[i]["code"]=="geometry"){
                return res
            }
        }
    }
    return '';
}
/*****************************************************************************
 * Create HTML part to display the line containing both the title and the
 * corresponding input for a given table's field.
 *****************************************************************************/
function printEditionFields(obj,myRoot,cid,mid){
    var list1=window.Android.displayTable("select * from mm4me_edition_fields where mm4me_edition_fields.edition>0 and eid="+obj["id"]+" order by mm4me_edition_fields.id asc",[]);
    if(!editSchema[mid])
        editSchema[mid]={};
    editSchema[mid][obj["id"]]=JSON.parse(list1);
    list1=JSON.parse(list1);
    myRoot.find(".tab-content").first().append('<div id="edition_form_'+cid+'" class="well tab-pane" role="tabpanel"></div>');
    for(var j in list1)
        if(list1[j]["edition"]>0){
            myRoot.find(".tab-content").first().children().last().append(
                '<div class="row form-group" >'+
                '<div class="col-xs-3">'+
                '<label for="edit_"'+list1[j]["id"]+'">'+list1[j]["alias"]+'</label>'+
                '</div>'+
                '<div class="col-xs-9">'+
                printCurrentType(list1[j],mid)+
                '</div>'+
                '</div>');
        }
    myRoot.find(".tab-content").first().children().last().append(
        '<div class="row btn-group" >'+
        '<button class="btn btn-default mm-act-'+(cid.indexOf('_')<0?'save':'add')+'">'+window.Android.translate((cid.indexOf('_')<0?'save':'add'))+'</button>'+
        '</div>');
    console.log(JSON.stringify(currentTypes));
    for(i in currentTypes){
        console.log(currentTypes[i]);
        $("#edition_form_"+cid).find("#"+currentTypes[i]).change();
    }
    myRoot.show();
}

/*****************************************************************************
 * Execute an Insert SQL query for a given table
 *****************************************************************************/
function runInsertQuery(obj,mid,func){
    if(MM4ME_DEBUG)
        console.log($(obj).attr('id')+" "+mid);
    var query="INSERT INTO "+cleanupTableName(allTables[mid].name);
    var queryAttr=[];
    var queryValues0=[];
    var queryValues=[];
    var queryTypes=[];
    $(obj).find("input,select,textarea").each(function(){
        if(MM4ME_DEBUG)
            console.log($(this).attr("name")+" <> "+$(this).val());
        try{

            var cid=$(this).attr("name").replace(/field_/g,"");
            console.log(!$("#"+cid+"_display").length || ($("#"+cid+"_display").length && $("#"+cid+"_display").is(":checked")));
            var found=false;
            if((!$("#"+cid+"_display").length || ($("#"+cid+"_display").length && $("#"+cid+"_display").is(":checked"))))
                for(var i in editSchema[mid]){
                    for(var j in editSchema[mid][i]){
                        if(editSchema[mid][i][j]["id"]==cid){
                            if(editSchema[mid][i][j]["name"].indexOf("unamed")<0){
                            if(MM4ME_DEBUG)
                                console.log(editSchema[mid][i][j]["name"]+" <> "+$(this).val());
                            queryAttr.push(editSchema[mid][i][j]["name"].replace(/wkb_geometry/g,"geometry"));
                            queryValues.push($(this).val());
                            queryValues0.push("?");
                            queryTypes.push(parseInt(editSchema[mid][i][j]["ftype"]));
                            }
                            found=true;
                            break;
                        }
                    }
                    if(found)
                        break;
                }
        }catch(e){
            console.log(e);
        }
    });
    var regs=[
        new RegExp("\\[","g"),
        new RegExp("\\]","g")
    ];

    for(var i in editSchema[mid]){
        for(var j in editSchema[mid][i]){
            if(editSchema[mid][i][j]["ftype"]==EDITION_TYPE_FILE && $("#"+editSchema[mid][i][j]["id"]+"_display").length && $("#"+editSchema[mid][i][j]["id"]+"_display").is(":checked") ){
                queryAttr.push(editSchema[mid][i][j]["name"]);
                queryValues0.push("?");
                queryTypes.push(parseInt(editSchema[mid][i][j]["ftype"]));
                queryValues.push($(obj).find("#value_"+editSchema[mid][i][j]["id"]).find("img").attr("src"));
                //subquery+=",readfile('"+$(obj).find("#value_"+editSchema[mid][i][j]["id"]).find("img").attr("src")+"')";
            }
        }
    }

    var ccol=getPKey(cleanupTableName(allTables[mid].name));
    queryAttr.push(ccol);
    var osubquery=("(select max("+ccol+") from "+cleanupTableName(allTables[mid].name)+")");
    var subquery=("(select CASE WHEN count(*) > 0 THEN max("+ccol+")+1 ELSE 1 END from "+cleanupTableName(allTables[mid].name)+")");
    if(refTables[mid]){
        queryAttr.push(refTables[mid]["col"]);
        subquery+=","+referenceIds[mtable];
    }

    //var req=(query+" ("+queryAttr.join(",")+") VALUES "+JSON.stringify(queryValues,null).replace(regs[0],"(")+"");
    var req=(query+" ("+queryAttr.join(",")+") VALUES ("+queryValues0.join(",")+","+subquery+")");
    if(MM4ME_DEBUG){
        console.log(req);
        console.log(queryTypes);
    }
    var res=window.Android.executeQuery(req,queryValues,queryTypes);
    window.Android.executeQuery("INSERT INTO history_log (tbl,sql,pkey_value) VALUES (?,?,"+osubquery+")",[cleanupTableName(allTables[mid].name),req],[1,1]);
    try{
        window.Android.showToast(window.Android.translate("insert_success"));
        func(mid);
    }catch(e){
        window.Android.notify("Error: "+e);
    }

}

var systemSelectedIndex=-1;
/*****************************************************************************
 * Execute an Update SQL query for a given table
 *****************************************************************************/
function runUpdateQuery(obj,mid,func){
    var query="UPDATE "+cleanupTableName(allTables[mid].name)+" set ";
    var queryAttr=[];
    var queryValues0=[];
    var queryValues=[];
    var queryTypes=[];
    var lastValue=$("#exampleTable"+((mid==mtable)?"":"_"+mid)).find(".selected").find('input[type=hidden]').first().val()?$("#exampleTable"+((mid==mtable)?"":"_"+mid)).find(".selected").find('input[type=hidden]').first().val():systemSelectedIndex;
    var ccol=getPKey(cleanupTableName(allTables[mid].name));
    var queryEnd=" WHERE "+ccol+"=?";
    var lcnt=0;
    $(obj).find("input,select,textarea").each(function(){
        if(MM4ME_DEBUG)
            console.log($(this).attr("name")+" <> "+$(this).val());
        try{
        var cid=$(this).attr("name").replace(/field_/g,"");
        console.log($(this).parent().is(":visible"));
        var found=false;
        if($(this).parent().is(":visible") || $(this).is(":visible"))
        for(var i in editSchema[mid]){
            for(var j in editSchema[mid][i]){
                if(editSchema[mid][i][j]["id"]==cid){
                    if(editSchema[mid][i][j]["name"].indexOf("unamed")<0){
                    console.log(JSON.stringify(editSchema[mid][i][j]));
                    if(MM4ME_DEBUG)
                        console.log(editSchema[mid][i][j]["name"]+" <> "+$(this).val());
                    query+=(lcnt>0?", ":"")+editSchema[mid][i][j]["name"].replace(/wkb_geometry/g,"geometry")+"=?";
                    queryTypes.push(parseInt(editSchema[mid][i][j]["ftype"]));
                    queryValues.push($(this).val());
                    //query+=(lcnt>0?", ":"")+editSchema[mid][i][j]["name"]+"="+JSON.stringify($(this).val(),null);
                    //queryAttr.push(editSchema[i][j]["name"]);
                    //queryValues.push($(this).val());
                    lcnt+=1;
                    }
                    found=true;
                    break;
                }
            }
            if(found)
                break;
        }
        }catch(e){
            console.log(e);
        }
    });
    for(var i in editSchema[mid]){
        for(var j in editSchema[mid][i]){
            if(editSchema[mid][i][j]["ftype"]==EDITION_TYPE_FILE && $(obj).find("#value_"+editSchema[mid][i][j]["id"]).find("img").length && $("#"+editSchema[mid][i][j]["id"]+"_display").length && $("#"+editSchema[mid][i][j]["id"]+"_display").is(":checked") ){
                //queryAttr.push(editSchema[mid][i][j]["name"]);
                query+=(lcnt>0?", ":"")+editSchema[mid][i][j]["name"]+"=?";
                queryTypes.push(parseInt(editSchema[mid][i][j]["ftype"]));
                queryValues.push($(obj).find("#value_"+editSchema[mid][i][j]["id"]).find("img").attr("src"));
                //subquery+=",readfile('"+$(obj).find("#value_"+editSchema[mid][i][j]["id"]).find("img").attr("src")+"')";
                lcnt+=1;
            }
        }
    }

    queryValues.push(lastValue);
    queryTypes.push(lastValue,1);
    var req=query+queryEnd;
    if(MM4ME_DEBUG)
        console.log(req);
    if(window.Android.executeQuery(req,queryValues,queryTypes)>=0){
        window.Android.executeQuery("INSERT INTO history_log (tbl,sql,pkey_value) VALUES (?,?,?)",[cleanupTableName(allTables[mid].name),req,lastValue],[1,1,1]);
        window.Android.showToast(window.Android.translate("update_success"));
        func(mid);
    }
}

/*****************************************************************************
 * Get the table's primary key, stored in the primary_keys table
 *****************************************************************************/
function getPKey(tbl){
    var req0="SELECT col FROM primary_keys where tbl='"+tbl+"'";
    if(MM4ME_DEBUG)
        console.log(req0);
    var list01=JSON.parse(window.Android.displayTable(req0,[]));
    if(MM4ME_DEBUG)
        console.log(JSON.stringify(list01[0]));
    return list01[0]["col"];
}

/*****************************************************************************
 * Get the geometry type, stored in the mm4me_gc table
 *****************************************************************************/
function getGeometryType(tbl){
    var req0="select type from mm4me_gc where f_table_schema||'_'||f_table_name = "+tbl+"";
    if(MM4ME_DEBUG)
        console.log(req0);
    var list01=JSON.parse(window.Android.displayTable(req0,[]));
    if(MM4ME_DEBUG)
        console.log(JSON.stringify(list01[0]));
    return list01[0]["type"];
}

/*****************************************************************************
 * The fucntion to call at the end of insert or update query
 *****************************************************************************/
function editTableReact(tid){
    var mid=tid;
    if(MM4ME_DEBUG)
        console.log("editTableReact("+mid+')');
    if(mid==mtable){
        $('.mm4me_listing').find('ul').first().find('a').first().click();
        $(".require-select").hide();
        listTable(allTables[mid].id,tblName,tblTitle,false);
    }
    else{
        $("#sub_tableContent_"+mid).find(".require-select").hide();
        $("#sub_tableContent_"+mid).find('ul').first().find('a').first().click();
        listInnerTable(mid,refTables[mid]["vid"],allTables[mid]["name"],refTables[mid]["name"],true,"_"+refTables[mid]["vid"],refTables[mid]["col"]+"="+referenceIds[refTables[mid]["oid"]]);
    }
}

/*****************************************************************************
 * Display the content of the current edited table.
 *****************************************************************************/
function listTable(id,name,title,init,prefix){
    tblId=mainTable[id];
    tblName=name;
    tblTitle=title;

    var list=window.Android.displayTable("select mm4me_editions.id,mm4me_editions.name from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+tblId+" and step>=0 order by mm4me_editions.step asc",[]);
    if(MM4ME_DEBUG)
        console.log(list);
    list=JSON.parse(list);
    if(MM4ME_DEBUG)
        console.log((!allTables[tblId]));
    if(!allTables[tblId]){
        allTables[tblId]={"id":id,"name":name,"title":title};
        mtable=tblId;

    $(".mm4me_edition").find("ul").first().html("");
    $(".mm4me_edition").find(".well").first().html("");
    $(".mm4me_listing").find("ul").first().append('<li role="presentation"><a data-toggle="tab" href="#edition_form_table">'+window.Android.translate('table')+'</a></li>');
    var cnt=0;
    for(var i in list){
        lastEdition[list[i]["id"]]=list[i];
        $(".mm4me_edition").find("ul").first().append('<li role="presentation" id="edition_link_'+list[i]["id"]+'"><a data-toggle="tab" href="#edition_form_'+list[i]["id"]+'">'+list[i]["name"]+'</a></li>');
        printEditionFields(list[i],$("#edition_form_edit"),list[i]["id"],mainTable[id]);
        if(cnt==0){
            try{
                var cid=list[i]["id"]+"_0";
                $(".mm4me_listing").find("ul").first().append('<li role="presentation" class="require-select"><a data-toggle="tab" href="#edition_form_edit">'+window.Android.translate('edit')+'</a></li>');
                $(".mm4me_listing").find("ul").first().append('<li role="presentation" id="edition_link_'+cid+'"><a data-toggle="tab" href="#edition_form_'+cid+'">'+window.Android.translate('add')+'</a></li>');
                $(".require-select").hide();
                printEditionFields(list[i],$(".mm4me_listing"),cid,mainTable[id]);
            }catch(e){
                console.log("**** ERROR ***> "+e);
            }
        }
        cnt+=1;
        }
    }

        $('.mm4me_listing').find('ul').first().find('a').click(function (e) {
          e.preventDefault();
          if($(this).parent().hasClass('require-select'))
            $('.mm4me_edition').show();
          else
            $('.mm4me_edition').hide();
          if(MM4ME_DEBUG)
            console.log("DEBUG !! "+$(this).hasClass('require-select'))
          $(this).tab('show');
        })
        $('.mm4me_edition').find('ul').find('a').click(function (e) {
          e.preventDefault();
          $(this).tab('show');
        })
        $('.mm4me_listing').find('ul').first().find('a').first().click();
        $('.mm4me_edition').find('ul').find('a').first().click();
        $('.swagEditor').summernote();
        $(".mm-act-add").click(function(){
            runInsertQuery($(this).parent().parent(),mainTable[id],editTableReact);
        });
        $(".mm-act-save").click(function(){
            runUpdateQuery($(this).parent().parent(),mainTable[id],editTableReact);
        });
        $(".breadcrumb").children().last().remove();
    //$('.mm4me_edition').hide();

    var list=window.Android.displayTable("SELECT id,name,value,alias,width,class from mm4me_view_fields where vid="+id+" order by id asc",[]);
    if(MM4ME_DEBUG)
        console.log(list);
    list=JSON.parse(list);
    var columnNames=[];
    var columns=[];
    var sqlColumns="";
    var orderColumn="id";
    var orderType="asc";
    //alert(list);
    for(var i=0;i<list.length;i++){
        columns.push({"title":list[i]["alias"],"width":list[i]["width"]});
        if(sqlColumns!="")
            sqlColumns+=", ";
        sqlColumns+=cleanupTableName(list[i]["value"]).replace(/wkb_geometry/g,"geometry")+" as "+list[i]["name"];
        columnNames.push(list[i]["name"]);
        if(list[i]["class"]>0){
            orderColumn=list[i]["name"];
            if(list[i]["class"]==1)
                orderType="desc";
        }
    }
    var ccol=getPKey(cleanupTableName(name));
    var req="SELECT "+ccol+" as ogc_fid FROM "+cleanupTableName(name)+" ORDER BY "+cleanupTableName(name)+"."+orderColumn+" "+orderType;
    var list1=JSON.parse(window.Android.displayTable(req,[]));
    req="SELECT "+sqlColumns+" FROM "+cleanupTableName(name)+" ORDER BY "+cleanupTableName(name)+"."+orderColumn+" "+orderType;
    var list=JSON.parse(window.Android.displayTable(req,[]));
    var dataSet = [];
    if(list)
    for(var i=0;i<list.length;i++){
        var tmpData=[];
        var cnt=0;
        if(MM4ME_DEBUG)
            console.log(Object.keys(list[i]));
        for(var j=0;j<columnNames.length;j++){
            if(!list[i][columnNames[j]])
                tmpData.push("");
            else
                tmpData.push(list[i][columnNames[j]]);
            if(j==0)
                tmpData[0]+='<input type="hidden" name="id" value="'+list1[i]["ogc_fid"]+'"/>';
        }
        if(MM4ME_DEBUG){
            console.log(JSON.stringify(columnNames));
            console.log(JSON.stringify(tmpData));
        }
        dataSet.push(tmpData);
    }
    var selected = [];

    var localName="exampleTable"+(!prefix?"":prefix);
    ((function(localName,mid){
    if(init){
        $(".breadcrumb").append('<li><a href="view.html"><span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span> '+window.Android.translate('view')+'</a></li>');
        $(".breadcrumb").append('<li class="active"><span class="glyphicon glyphicon-list" aria-hidden="true"></span> '+tblTitle+'</a></li>');

        var options={
            data: dataSet,
            columns: columns,
            "scrollX": true,
            scrollY:        '50vh',
            scrollCollapse: true,
            select: true
        };
        if(langUrl!=null)
            options["language"]={
                url: langUrl
            };
        $('#'+localName).DataTable( options );
        $('#'+localName+' tbody').on('click', 'tr', function () {
            var id = this.id;
            var index = $.inArray(id, selected);

            if ( index === -1 ) {
                selected.push( id );
            } else {
                selected.splice( index, 1 );
            }
            displayEditForm(mid,$(this).find("input[name=id]").first().val(),true);
            var tmp=$(this).hasClass('selected');
            var closure=$(this);
            $('#'+localName+' tbody tr').each(function(){$(this).removeClass('selected')});
            $(this).toggleClass('selected');
            if(!tmp)
                $(this).toggleClass('selected');
            /*else
                $(this).removeClass('selected');*/

        } );
    }else{
        $('#'+localName).dataTable().fnClearTable();
        $('#'+localName).dataTable().fnAddData(dataSet);
    }
    })(localName,mainTable[id]));

    setTimeout(function() { updateChangingFields(changingFields) }, 1500);
    $('.mm4me_listing').show();
    $('.mm4me_content').hide();
}

/*****************************************************************************
 * Update a field depending on another field value (i.e region > department)
 *****************************************************************************/
function updateChangingFields(changingFields){
    console.log(JSON.stringify(changingFields));
    try{
    for(var i=0;i<changingFields.length;i++){
        for(var key in changingFields[i]){
            var localFunc=function(changingField){
                return function(){
                    for(var j=0;j<changingField.length;j++){
                        for(var ckey in changingField[j]){
                            console.log("CKEY: "+ckey);
                            var i=0;
                            $(this).parent().parent().parent().find("select[name=field_"+changingField[j][ckey]["id"]+"]").html("");
                            var cIndex=changingField[j][ckey]["options"].indexOf($(this).val());
                            //window.Android.showToast(cIndex+" "+changingField[j][ckey]["values"][cIndex]);
                            var cnt0=0;
                            for(i=0;i<changingField[j][ckey]["values"][cIndex].length;i++){
                                var cnt=0;
                                var cStr="<option ";
                                for(var lkey in changingField[j][ckey]["values"][cIndex][i]){
                                    console.log(changingField[j][ckey]["values"][cIndex][i][lkey]);
                                    if(cnt==0)
                                        cStr+=' value="'+changingField[j][ckey]["values"][cIndex][i][lkey]+'"'+(cnt0==0?'" selected="selected"':'')+' >';
                                    else
                                        cStr+=changingField[j][ckey]["values"][cIndex][i][lkey]+'</option>';
                                    cnt+=1;
                                }
                                cnt0+=1;
                                $("select[name=field_"+changingField[j][ckey]["id"]+"]").append(cStr);
                            }
                            if(i==0)
                                $("select[name=field_"+changingField[j][ckey]["id"]+"]").html('<option value="NULL">'+window.Android.translate('none')+'</option>');
                            $("select[name=field_"+changingField[j][ckey]["id"]+"]").change();

                        }
                    }
                };
            };
            $("select[name=field_"+key+"]").off('change');
            $("select[name=field_"+key+"]").change(localFunc(changingFields[i][key]["dep"]));
            $("select[name=field_"+key+"]").change();
        }
    }
    }catch(e){
        console.log(e);
        setTimeout(function() { updateChangingFields(changingFields) }, 500);
    }
}

/*****************************************************************************
 * Display the content of a table referencing the current edited table.
 *****************************************************************************/
function listInnerTable(id,vid,name,title,init,prefix,clause,ref){
    var list=JSON.parse(window.Android.displayTable("select mm4me_tables.id as tid,mm4me_tables.name as tname,mm4me_editions.id,mm4me_editions.name from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+id+" order by mm4me_editions.step asc",[]));
    var cnt=0;
    var detectInit=true;
    var tid=0;
    for(var i in list){
        lastEdition[list[i]["id"]]=list[i];
        tid=list[i]["tid"];
        if(!allTables[list[i]["tid"]]){
            allTables[list[i]["tid"]]={"id":list[i]["id"],"name":list[i]["tname"],"title":list[i]["name"]};
            detectInit=false;
            $("#sub_tableContent_"+id+"").find(".mm4me_edition").find("ul").first().append('<li role="presentation" id="edition_link_'+list[i]["id"]+'"><a data-toggle="tab" href="#edition_form_'+list[i]["id"]+'">'+list[i]["name"]+'</a></li>');
            printEditionFields(list[i],$("#sub_tableContent_"+id+"").find(".mm4me_edition"),list[i]["id"],list[i]["tid"]);
            if(cnt==0){
                try{
                    var cid=list[i]["id"]+"_0";
                    $("#sub_tableContent_"+id+"").find("ul").first().append('<li role="presentation"><a data-toggle="tab" href="#edition_form_table_'+id+'">'+window.Android.translate('table')+'</a></li>');
                    $("#sub_tableContent_"+id+"").find("ul").first().append('<li role="presentation" class="require-select"><a data-toggle="tab" href="#edition_form_edit_'+id+'">'+window.Android.translate('edit')+'</a></li>');
                    $("#sub_tableContent_"+id+"").find("ul").first().append('<li role="presentation" id="edition_link_'+cid+'"><a data-toggle="tab" href="#edition_form_'+cid+'">'+window.Android.translate('add')+'</a></li>');
                    $("#sub_tableContent_"+id+" .require-select").hide();
                    printEditionFields(list[i],$("#sub_tableContent_"+id+""),cid,list[i]["tid"]);
                }catch(e){
                    console.log("**** ERROR ***> "+e);
                }
            }
            var myRoot=$("#sub_tableContent_"+id+"");
            myRoot.find('ul').first().find('a').click(function (e) {
                e.preventDefault();
                if($(this).parent().hasClass('require-select'))
                    myRoot.find('.mm4me_edition').show();
                else
                    myRoot.find('.mm4me_edition').hide();
                $(this).tab('show');
            })
            myRoot.find('ul').first().find('a').first().click();
            myRoot.find('.mm4me_edition').find('ul').find('a').first().click();
                    myRoot.find('.swagEditor').summernote();
                    myRoot.find(".mm-act-add").click(function(){
                        runInsertQuery($(this).parent().parent(),tid,editTableReact);
                    });
                    myRoot.find(".mm-act-save").click(function(){
                        runUpdateQuery($(this).parent().parent(),tid,editTableReact);
                    });

        }
        cnt+=1;
    }

    var list=JSON.parse(window.Android.displayTable("SELECT id,name,value,alias,width,class from mm4me_view_fields where vid="+vid+" order by id",[]));
    var columns=[];
    var columnNames=[];
    var sqlColumns="";
    var orderColumn="id";
    var orderType="asc";
    for(var i=0;i<list.length;i++){
        columns.push({"title":list[i]["alias"],"width":list[i]["width"]});
        if(sqlColumns!="")
            sqlColumns+=", ";
        sqlColumns+=cleanupTableName(list[i]["value"])+" as "+list[i]["name"];
        columnNames.push(list[i]["name"]);
        if(list[i]["class"]>0){
            orderColumn=list[i]["name"];
            if(list[i]["class"]==1)
                orderType="desc";
        }
    }
    var ccol=getPKey(cleanupTableName(name));
    var req="SELECT "+ccol+" as ogc_fid FROM "+cleanupTableName(name)+" WHERE "+clause+" ORDER BY "+cleanupTableName(name)+"."+orderColumn+" "+orderType;
    var list1=JSON.parse(window.Android.displayTable(req,[]));
    req="SELECT "+sqlColumns+" FROM "+cleanupTableName(name)+" WHERE "+clause+" ORDER BY "+cleanupTableName(name)+"."+orderColumn+" "+orderType;
    var list=JSON.parse(window.Android.displayTable(req,[]));
    var dataSet = [];
    for(var i=0;i<list.length;i++){
        var tmpData=[];
        var cnt=0;
        for(var j=0;j<columnNames.length;j++){
            tmpData.push(list[i][columnNames[j]]);
            if(cnt==0)
                tmpData[0]+='<input type="hidden" name="id" value="'+list1[i]["ogc_fid"]+'"/>';
            cnt+=1;
        }
        dataSet.push(tmpData);
    }
    var selected = [];

    //$("#edition_form_table").html('<table id="exampleTable" class="table table-striped table-bordered" cellspacing="0" width="100%"></table>');
    var localName="exampleTable_"+id;
    ((function(localName,sid){

    if(!detectInit){

        var options={
            data: dataSet,
            columns: columns,
            "scrollX": true,
            scrollY:        '50vh',
            scrollCollapse: true,
            select: true,
            "rowCallback": function( row, data ) {
                if ( $.inArray(data.DT_RowId, selected) !== -1 ) {
                    $(row).addClass('selected');
                }
            }
        };
        if(langUrl!=null)
            options["language"]={
                url: langUrl
            };

        $('#'+localName).DataTable( options );
        $('#'+localName+' tbody').on('click', 'tr', function () {
            var id = this.id;
            var index = $.inArray(id, selected);

            if ( index === -1 ) {
                selected.push( id );
            } else {
                selected.splice( index, 1 );
            }
            displayEditForm(sid,$(this).find("input[name=id]").first().val(),true);
            var tmp=$(this).hasClass('selected');
            $('#'+localName+' tbody tr').removeClass('selected');
            $(this).toggleClass('selected');
            if(!tmp)
                $(this).toggleClass('selected');
        } );

    }else{
        $('#'+localName).dataTable().fnClearTable();
        if(dataSet.length>0)
        $('#'+localName).dataTable().fnAddData(dataSet);
    }
    $("#sub_tableContent_"+id+"").find("ul").first().find('a').first().click();
    })(localName,tid));

}

/*****************************************************************************
 * Show the edit form
 *****************************************************************************/
function displayEditForm(cid,selectedId,basic){
    if(basic && !$("#exampleTable"+(cid==mtable?"":"_"+cid)).find(".selected").find('input[type=hidden]').first().val()){
        if(cid==mtable){
            $("#main_tableContent").find(".require-select").hide();
            $("#main_tableContent").find("ul").first().find("a").first().click();
            if($(".breadcrumb").children().length==4)
                $(".breadcrumb").children().last().remove();

        }else{
            $("#sub_tableContent_"+cid).find(".require-select").hide();
            $("#sub_tableContent_"+cid).find("ul").first().find("a").first().click();
        }
        return;
    }
    var fields=[]
    var sizedFields=[];
    var sizedFieldsAlias=[];
    var notSizedFields=[];
    for(var i in editSchema[cid]){
        for(var j in editSchema[cid][i]){
            console.log(JSON.stringify(editSchema[cid][i][j]));
            if(editSchema[cid][i][j]["ftype"]=="5"){
                sizedFields.push(editSchema[cid][i][j]["name"].replace(/wkb_geometry/g,"geometry"));
                sizedFieldsAlias.push(editSchema[cid][i][j]["id"]);
            }
            else
                notSizedFields.push(editSchema[cid][i][j]["name"].replace(/wkb_geometry/g,"geometry")+" AS \""+editSchema[cid][i][j]["id"]+"\"");
            if(editSchema[cid][i][j]["name"].indexOf("unamed")<0)
                fields.push(editSchema[cid][i][j]["name"].replace(/wkb_geometry/g,"geometry")+" AS \""+editSchema[cid][i][j]["id"]+"\"");
        }
    }
    var ccol=getPKey(cleanupTableName(allTables[cid].name));
    /* $("#exampleTable"+(cid==mtable?"":"_"+cid)).find(".selected").find('input[type=hidden]').first().val() */
    var editValues;
    if(sizedFields.length>0){
        for(var i=0;i<sizedFields.length;i++){
            var hasElement=JSON.parse(window.Android.displayTable("select count("+sizedFields[i]+") as cnt, length("+sizedFields[i]+") as len from "+cleanupTableName(allTables[cid].name)+" where length("+sizedFields[i]+") > 1000000 and "+ccol+"="+selectedId,[]));
            console.log(JSON.stringify(hasElement[0]));
            if(hasElement[0]["cnt"]!="0"){
                var nbIteration=parseInt(hasElement[0]["len"])/1000000;
                var zfields=[]
                var len=0;
                var query="";
                var len1=parseInt(hasElement[0]["len"]);
                for(var j=0;j<len1;j+=1000000){
                    if((j+1000000)<=len1)
                        zfields.push("substr("+sizedFields[i]+","+(j+1)+","+1000000+") as mm_chunk");
                    else
                        zfields.push("substr("+sizedFields[i]+","+(j+1)+","+((len1-(j+1)))+") as mm_chunk");

                    len+=1;
                    if(query!="")
                        query+=" UNION ";
                    query+=" SELECT "+zfields[zfields.length-1]+" from "+cleanupTableName(allTables[cid].name)+" WHERE "+ccol+"="+selectedId+" ";
                }
                var chunks=null;
                try{
                    console.log(query);
                    chunks=JSON.parse(window.Android.rebuildChunk(query,[]));
                }catch(e){
                    alert("RebuildChunk "+e);
                }
                editValues=window.Android.displayTable("select "+ccol+" as local_id,"+notSizedFields.join(", ")+" from "+cleanupTableName(allTables[cid].name)+" where "+ccol+"="+selectedId,[]);
                editValues=JSON.parse(editValues);
                editValues[0][sizedFieldsAlias[i]]=chunks[0]["mm_chunk"];
            }
            else{
                editValues=window.Android.displayTable("select "+ccol+" as local_id,"+fields.join(", ")+" from "+cleanupTableName(allTables[cid].name)+" where "+ccol+"="+selectedId,[]);
                editValues=JSON.parse(editValues);
            }
        }
    }else{
        editValues=window.Android.displayTable("select "+ccol+" as local_id,"+fields.join(", ")+" from "+cleanupTableName(allTables[cid].name)+" where "+ccol+"="+selectedId,[]);
        editValues=JSON.parse(editValues);

    }

    for(var i in editValues){
        referenceIds[cid]=editValues[i]["local_id"];
        for(var j in editValues[i]){
            if($("#value_"+j).length){
                console.log("#value_"+j);
                console.log(editValues[i][j]);
                $("#value_"+j).html(editValues[i][j]);
            }
            else{
            $('.mm4me_edition').find("input[name=field_"+j+"],select[name=field_"+j+"],textarea[name=field_"+j+"]").first().val(editValues[i][j]).change();
            $('.mm4me_edition').find("textarea[name=field_"+j+"]").first().each(function(){
                if($(this).hasClass("swagEditor")){
                    try{
                        $(this).summernote('disable');
                        $(this).val(editValues[i][j]);
                        $(this).summernote('enable');
                        $(this).summernote('code',editValues[i][j]);
                    }catch(e){
                        console.log("*** ERROR : "+e);
                    }
                }
            });
            if($("#field_"+j+"_map").length>0){
                $("#field_"+j+"_map").show();
                $("#field_"+j+"_map").off('click');
                $("#field_"+j+"_map").on('click',function(){
                    console.log("Display table with a selected feature");
                    console.log($(this).prev().val());
                    showElementOnMap($(this).prev().val());
                });
            }
                if($(".btn_field_"+j+"_lat").length>0){
                    //alert(editValues[i][j]);
                    $(".btn_field_"+j+"_lat").html(editValues[i][j]);
                    $(".btn_field_"+j+"_long").html("");
                    $(".btn_field_"+j+"_source").html("");
                    $("input[name='field_"+j+"']").val("POINT"+editValues[i][j]);

                }
            }
            //$(".swagEditor").summernote();
        }
    }

    for(var i in editSchema[cid]){
        for(var j in editSchema[cid][i]){
            if(editSchema[cid][i][j]["name"].indexOf("unamed")>=0){
                if(editSchema[cid][i][j]["ftype"]==6){
                    var tmp=editSchema[cid][i][j]["value"].split(';');
                    var list=JSON.parse(window.Android.displayTable("select "+tmp[1]+" from "+cleanupTableName(tmp[2])+" where "+tmp[0]+"=(SELECT id from "+cleanupTableName(tblName)+" WHERE ogc_fid="+selectedId+")",[]));
                    editValues["0"][editSchema[cid][i][j]["id"]]=list;
                    for(var k in list){
                        for(var l in list[k]){
                            $('.mm4me_edition').find("select[name=field_"+editSchema[cid][i][j]["id"]+"]").find('option').each(function(){
                                if($(this).val()==list[k][l])
                                    $(this).prop("selected",true);
                            });
                        }
                    }
                }
            }
        }
    }

    if(cid==mtable){
    if($(".breadcrumb").children().length==4)
        $(".breadcrumb").children().last().remove();
    $(".breadcrumb").append('<li class="active"><span class="glyphicon glyphicon-file" aria-hidden="true"></span> '+editValues["0"]["local_id"]+'</a></li>');
    }
    ((cid==mtable)?$(".require-select"):$("#sub_tableContent_"+cid).find(".require-select")).first().show();
    ((cid==mtable)?$(".require-select"):$("#sub_tableContent_"+cid).find(".require-select")).first().find("a").first().click();

    if(toRunOnLoad[cid])
    for(var i=0;i<toRunOnLoad[cid].length;i++){
        toRunOnLoad[cid][i](valuesOnLoad[cid][i],editValues["0"]);
     }
}

/*****************************************************************************
 * The function to call at the end of insert or update query (edit only)
 *****************************************************************************/
function editOnlyTableReact(tid){
    var mid=tid;
    if(MM4ME_DEBUG)
        console.log("editOnlyTableReact("+mid+')');
    if(mid==mtable){
        $('.mm4me_listing').find('ul').first().find('a').first().click();
        var ccol=getPKey(cleanupTableName(allTables[mid].name));
        var list=JSON.parse(window.Android.displayTable("select max("+ccol+") as val from "+cleanupTableName(allTables[mid].name),[]));
        $(".require-select").show();
        $(".mm-act-add").removeClass("mm-act-add").addClass("mm-act-save").html(window.Android.translate("save")).off("click").click(function(){
            runUpdateQuery($(this).parent().parent(),mainTable[id],editOnlyTableReact);
        });
        systemSelectedIndex=list[0].val;
        displayEditForm(mid,list[0].val,false);
    }
}

/*****************************************************************************
 * Display the content edit form for the current table.
 *****************************************************************************/
function listEdit(id,name,title,init,prefix){
    tblId=mainTable[id];
    tblName=name;
    tblTitle=title;

    var list=window.Android.displayTable("select mm4me_editions.id,mm4me_editions.name from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+tblId+" and step>=0 order by mm4me_editions.step asc",[]);
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
        $(".mm4me_edition").find("ul").first().append('<li role="presentation" id="edition_link_'+cid+'"><a data-toggle="tab" href="#edition_form_'+cid+'">'+list[i]["name"]+'</a></li>');
        printEditionFields(list[i],$("#edition_form_edit"),cid,mainTable[id]);
    }
    if(list.length==1)
        $(".mm4me_edition").find("ul").first().hide();

    var aCnt=0;
    $('.mm4me_edition').find('ul').first().find('a').each(function () {
        if(aCnt>0)
            $(this).parent().addClass('require-select');
        aCnt+=1;
    });
    $(".require-select").hide();
    $('.mm4me_listing').find('ul').first().find('a').first().click();
    $('.mm4me_edition').find('ul').find('a').first().click();
    $('.swagEditor').summernote();
    $(".mm-act-add").click(function(){
        runInsertQuery($(this).parent().parent(),mainTable[id],editOnlyTableReact);
    });
    $(".mm-act-save").click(function(){
        runUpdateQuery($(this).parent().parent(),mainTable[id],editOnlyTableReact);
    });
    $(".breadcrumb").children().last().remove();
    $(".breadcrumb").append('<li><a href="edit.html"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span> '+window.Android.translate('edit')+'</a></li>');
    $(".breadcrumb").append('<li class="active"><span class="glyphicon glyphicon-list" aria-hidden="true"></span> '+tblTitle+'</a></li>');

    setTimeout(function() { updateChangingFields(changingFields) }, 1500);

    /*for(var i=0;i<changingFields.length;i++){
        for(var key in changingFields[i]){
            var localFunc=function(changingField){
                return function(){
                    for(var j=0;j<changingField.length;j++){
                        for(var ckey in changingField[j]){
                            var i=0;
                            $(this).parent().parent().parent().find("select[name=field_"+changingField[j][ckey]["id"]+"]").html("");
                            var cIndex=changingField[j][ckey]["options"].indexOf($(this).val());
                            for(i=0;i<changingField[j][ckey]["values"][cIndex].length;i++){
                                var cnt=0;
                                var cStr="<option ";
                                for(var lkey in changingField[j][ckey]["values"][cIndex][i]){
                                    if(cnt==0)
                                        cStr+=' value="'+changingField[j][ckey]["values"][changingField[j][ckey]["options"].indexOf($(this).val())][i][lkey]+'" >';
                                    else
                                        cStr+=changingField[j][ckey]["values"][cIndex][i][lkey]+'</option>';
                                    cnt+=1;
                                }
                                $("select[name=field_"+changingField[j][ckey]["id"]+"]").append(cStr);
                            }
                            if(i==0)
                                $("select[name=field_"+changingField[j][ckey]["id"]+"]").html('<option value="NULL">'+window.Android.translate('none')+'</option>');
                        }
                    }
                };
            };
            $("select[name=field_"+key+"]").off('change');
            $("select[name=field_"+key+"]").change(localFunc(changingFields[i][key]["dep"]));
            $("select[name=field_"+key+"]").change();
        }
    }*/
    $('.mm4me_listing').show();
    $('.mm4me_content').hide();

}

/*****************************************************************************
 * In case no server is configured
 *****************************************************************************/
function displayNoListing(){
    $.ajax({
        method: "GET",
        url: 'content/nolisting.html',
        success: function(data){
            if(MM4ME_DEBUG)
                console.log('Display warning message on the UI !');
            $(".mm4me_content").html(data);
            $(".mm4me_content").find(".pannel-body").find("p").first().html(window.Android.translate("mm_no_db_found"));
        },
        error: function(){
            window.Android.showToast("error !");
        }
    });
}


/*****************************************************************************
 * Authenticate a user
 *****************************************************************************/
function authenticate(url,login,passwd,func,func1){
    var curl=url+"?service=WPS&request=Execute&version=1.0.0&Identifier=authenticate.clogIn&DataInputs=login="+login+";password="+passwd+"&RawDataOutput=Result";
    if(MM4ME_DEBUG)
        console.log(curl);
    $.ajax({
        method: "GET",
        url: curl,
        success: function(data){
            if(MM4ME_DEBUG)
                console.log(data);
            if(func){
                console.log("Call func!")
                func();
            }
        },
        error: function(){
            if(func1){
                func1();
            }
            else{
                disconnect(url);
                if(MM4ME_DEBUG)
                    console.log("unable to login!");
                var hasBeenShown=false;
                var xml=arguments[0].responseText;
                $(xml).find("ows\\:ExceptionText").each(function(){
                    window.Android.showToast($(this).text());
                    hasBeenShown=true;
                });
                if(!hasBeenShown){
                    window.Android.showToast(JSON.stringify(arguments));
                }
            }

        }
    });
}

/*****************************************************************************
 * Disconnect a user
 *****************************************************************************/
function disconnect(url){
    var curl=url+"?service=WPS&request=Execute&version=1.0.0&Identifier=authenticate.clogOut&DataInputs=&RawDataOutput=Result";
    if(MM4ME_DEBUG)
        console.log(curl);
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

var geometries={"line":{"geom":null,"constructor": "ol.geom.Linestring"},"polygon":{"geom":null,"constructor":"ol.geom.Polygon","cline":null}};
var stopTracking=false;
var currentGeometry="line";
var currentGeometryField="none";
var map=null;
var vectorLayer,vectorLayer1;
var position;

/*****************************************************************************
 * Track modification of the GPS location
 *****************************************************************************/
function trackCurrentGPSPosition(){
    console.log("## trackCurrentGPSPosition");
    updateCurrentMapLocation();

    var tmp0=geometries["origin"].getCoordinates();
    if(geometries[currentGeometry]["geom"]!=null){
        var tmp1=geometries[currentGeometry]["geom"].getCoordinates();
        tmp0=tmp1[tmp1.length-1];
    }
    tmp=ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857');
    console.log(JSON.stringify(tmp0));
    console.log(JSON.stringify(tmp));
    $("#currentPosition").html("<b>Position: "+position[bestIndex].lon.toFixed(6)+","+position[bestIndex].lat.toFixed(6)+"</b>");
    if(tmp0[0]==tmp[0] && tmp0[1]==tmp[1]){
        console.log(" !!!!!!!! Same position!!!!!!!! ");
        if(!stopTracking)
            setTimeout(function() { trackCurrentGPSPosition();}, 1000);
        return;
    }

    console.log(JSON.stringify(tmp0));
    console.log(JSON.stringify(tmp));
    if(geometries[currentGeometry]["geom"]==null){
        //geometries[currentGeometry]=new geometries[currentGeometry]["constructor"]([tmp0,tmp]);
        if(currentGeometry=="line")
            geometries[currentGeometry]["geom"]=new ol.geom.LineString([tmp0,tmp]);
        else
            geometries[currentGeometry]["geom"]=new ol.geom.LineString([tmp0,tmp]);
    }else{
        if(currentGeometry=="line"){
            tmpCoordinates=geometries[currentGeometry]["geom"].getCoordinates();
            tmpCoordinates.push(tmp);
            geometries[currentGeometry]["geom"]=new ol.geom.LineString(tmpCoordinates);
        }
        else{
            if(geometries[currentGeometry]["cline"]==null)
                tmpCoordinates=geometries[currentGeometry]["geom"].getCoordinates();
            else
                tmpCoordinates=geometries[currentGeometry]["cline"].getCoordinates();
            console.log(JSON.stringify(tmpCoordinates));
            tmpCoordinates.push(tmp);
            console.log(JSON.stringify(tmpCoordinates));
            if(tmpCoordinates.length>2){
                geometries[currentGeometry]["cline"]=new ol.geom.LineString(tmpCoordinates);
                tmpCoordinates.push(tmpCoordinates[0]);
                console.log(JSON.stringify(tmpCoordinates));
                geometries[currentGeometry]["geom"]=new ol.geom.Polygon();
                console.log(JSON.stringify(tmpCoordinates));
                geometries[currentGeometry]["geom"].appendLinearRing(new ol.geom.LinearRing(tmpCoordinates));
                console.log(JSON.stringify(tmpCoordinates));
            }
        }

    }
    console.log(JSON.stringify(tmp0));
    console.log(JSON.stringify(tmp));
    try{
    console.log(JSON.stringify(geometries[currentGeometry]["geom"].getCoordinates()));
    var feature=new ol.Feature({geometry: geometries[currentGeometry]["geom"],"name":"myFeature"});
    vectorLayer1.getSource().clear();
    vectorLayer1.getSource().addFeatures([feature]);
    var wkt=new ol.format.WKT();
    var tmpGeometry=geometries[currentGeometry]["geom"].clone().transform('EPSG:3857', 'EPSG:4326');
    console.log(wkt.writeGeometry(tmpGeometry));
    $("input[name='"+currentGeometryField+"']").val(wkt.writeGeometry(tmpGeometry));
    }catch(e){
    console.log(e);
    }
    console.log(JSON.stringify(tmp0));
    console.log(JSON.stringify(tmp));
    if(!stopTracking)
        setTimeout(function() { trackCurrentGPSPosition();}, 1000);
    console.log(JSON.stringify(tmp0));
    console.log(JSON.stringify(tmp));
}

var modalCallback=null;

function trackStepCurrentGPSPosition(){
    console.log("## trackStepCurrentGPSPosition");
    updateCurrentMapLocation();
    $("#currentPosition").html("<b>Position: "+position[bestIndex].lon.toFixed(6)+","+position[bestIndex].lat.toFixed(6)+"</b>");
    if(!stopTracking)
        setTimeout(function() { trackStepCurrentGPSPosition();}, 1000);
}

function addCurrentLocation(){
    console.log("addCurrentLocation!!!!");
    if(geometries["origin"]==null)
        geometries["origin"]=new ol.geom.Point(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857'));
    else{
        var tmp0=geometries["origin"].getCoordinates();
        if(geometries[currentGeometry]["geom"]!=null){
            var tmp1=geometries[currentGeometry]["geom"].getCoordinates();
            tmp0=tmp1[tmp1.length-1];
        }
        tmp=ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857');
        console.log(JSON.stringify(tmp0));
        console.log(JSON.stringify(tmp));
        $("#currentPosition").html("<b>Position: "+position[bestIndex].lon.toFixed(6)+","+position[bestIndex].lat.toFixed(6)+"</b>");
        if(geometries[currentGeometry]["geom"]==null){
            //geometries[currentGeometry]=new geometries[currentGeometry]["constructor"]([tmp0,tmp]);
            if(currentGeometry=="line")
                geometries[currentGeometry]["geom"]=new ol.geom.LineString([tmp0,tmp]);
            else
                geometries[currentGeometry]["geom"]=new ol.geom.LineString([tmp0,tmp]);
        }else{
            if(currentGeometry=="line"){
                tmpCoordinates=geometries[currentGeometry]["geom"].getCoordinates();
                tmpCoordinates.push(tmp);
                geometries[currentGeometry]["geom"]=new ol.geom.LineString(tmpCoordinates);
            }
            else{
                if(geometries[currentGeometry]["cline"]==null)
                    tmpCoordinates=geometries[currentGeometry]["geom"].getCoordinates();
                else
                    tmpCoordinates=geometries[currentGeometry]["cline"].getCoordinates();
                console.log(JSON.stringify(tmpCoordinates));
                tmpCoordinates.push(tmp);
                console.log(JSON.stringify(tmpCoordinates));
                if(tmpCoordinates.length>2){
                    geometries[currentGeometry]["cline"]=new ol.geom.LineString(tmpCoordinates);
                    tmpCoordinates.push(tmpCoordinates[0]);
                    console.log(JSON.stringify(tmpCoordinates));
                    geometries[currentGeometry]["geom"]=new ol.geom.Polygon();
                    console.log(JSON.stringify(tmpCoordinates));
                    geometries[currentGeometry]["geom"].appendLinearRing(new ol.geom.LinearRing(tmpCoordinates));
                    console.log(JSON.stringify(tmpCoordinates));
                }
            }

        }
        try{
            console.log(JSON.stringify(geometries[currentGeometry]["geom"].getCoordinates()));
            var feature=new ol.Feature({geometry: geometries[currentGeometry]["geom"],"name":"myFeature"});
            vectorLayer1.getSource().clear();
            vectorLayer1.getSource().addFeatures([feature]);
            var wkt=new ol.format.WKT();
            var tmpGeometry=geometries[currentGeometry]["geom"].clone().transform('EPSG:3857', 'EPSG:4326');
            console.log(wkt.writeGeometry(tmpGeometry));
            $("input[name='"+currentGeometryField+"']").val(wkt.writeGeometry(tmpGeometry));
        }catch(e){
            console.log(e);
        }

    }
}

function trackStepByStepPosition(elem,ltype){
    modalCallback=function(){
        //$("#myModal").find(".glyphicon-ok").parent().show();
        if(myVectorLayer)
            myVectorLayer.getSource().clear();
        geometries["origin"]=null;
        setTimeout(function() { trackStepCurrentGPSPosition();}, 1000);
        $("#myModal").find("h4").html('<span class="glyphicon glyphicon-map-marker"></span> '+window.Android.translate("gps_track"));
        $("#myModal").find(".modal-footer").html(
        '<button type="submit" class="btn btn-danger btn-default pull-left" data-dismiss="modal"><span class="glyphicon glyphicon-remove"></span> Cancel</button>'+
        '<button type="submit" class="btn btn-primary btn-default pull-left" onclick="addCurrentLocation()"><span class="glyphicon glyphicon-plus"></span> Add</button>'+
        '<button type="submit" class="btn btn-primary btn-default pull-left" data-dismiss="modal"><span class="glyphicon glyphicon-ok"></span> Save</button>'
        );
    };
    currentGeometry=ltype;
    currentGeometryField=elem;
    geometries[ltype]["geom"]=null;
    geometries[ltype]["cline"]=null;
    if(!$("#map").length)
    $.ajax({
        method: "GET",
        url: './map-modal.html',
        error: function(){
        },
        success: function(data){
            console.log(data);
            $("body").append(data);
            $("#map").css("height",($(window).height()-220)+"px");
            $('#myModal').modal();
            addOptionalLocalTiles(true);
            $('#myModal').on('shown.bs.modal', function () {
                console.log($("#mmm4me_ls").length);
                initMapToLocation();
                localTileIndex=map.getLayers().getLength();
                /*geometries["origin"]=new ol.geom.Point(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857'));
                setTimeout(function() { trackCurrentGPSPosition();}, 1000);*/
                modalCallback();
            });
            $('#myModal').on('hide.bs.modal', function () {
                console.log("HIDE");
                stopTracking=true;
            });
        }
    });
    else{
        stopTracking=false;
        $('#myModal').modal();
        vectorLayer1.getSource().clear();
        updateCurrentMapLocation();
        geometries["origin"]=null;
        setTimeout(function() { trackStepCurrentGPSPosition();}, 1000);
    }
}
/*****************************************************************************
 * Start tracking GPS location
 *****************************************************************************/
function trackGPSPosition(elem,ltype){
    modalCallback=function(){
        //$("#myModal").find(".glyphicon-ok").parent().show();
        if(myVectorLayer)
            myVectorLayer.getSource().clear();
        geometries["origin"]=new ol.geom.Point(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857'));
        setTimeout(function() { trackCurrentGPSPosition();}, 1000);
        $("#myModal").find("h4").html('<span class="glyphicon glyphicon-map-marker"></span> '+window.Android.translate("gps_track"));
        $("#myModal").find(".modal-footer").html(
            '<button type="submit" class="btn btn-danger btn-default pull-left" data-dismiss="modal"><span class="glyphicon glyphicon-remove"></span> Cancel</button>'+
            '<button type="submit" class="btn btn-primary btn-default pull-left" data-dismiss="modal"><span class="glyphicon glyphicon-ok"></span> Save</button>'
        );
    };
    currentGeometry=ltype;
    currentGeometryField=elem;
    geometries[ltype]["geom"]=null;
    geometries[ltype]["cline"]=null;
    if(!$("#map").length)
    $.ajax({
        method: "GET",
        url: './map-modal.html',
        error: function(){
        },
        success: function(data){
            console.log(data);
            $("body").append(data);
            $("#map").css("height",($(window).height()-220)+"px");
            $('#myModal').modal();
            addOptionalLocalTiles(true);
            $('#myModal').on('shown.bs.modal', function () {
                console.log($("#mmm4me_ls").length);
                initMapToLocation();
                localTileIndex=map.getLayers().getLength();
                /*geometries["origin"]=new ol.geom.Point(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857'));
                setTimeout(function() { trackCurrentGPSPosition();}, 1000);*/
                modalCallback();
            });
            $('#myModal').on('hide.bs.modal', function () {
                console.log("HIDE");
                stopTracking=true;
            });
        }
    });
    else{
        stopTracking=false;
        $('#myModal').modal();
        vectorLayer1.getSource().clear();
        updateCurrentMapLocation();
        geometries["origin"]=new ol.geom.Point(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326','EPSG:3857'));
        setTimeout(function() { trackCurrentGPSPosition();}, 1000);
    }
}

var hasAddedElement=0;
var myVectorLayer=null;
function addSelectedElement(wktString){
    var features=[];
        try{
            var format = new ol.format.WKT();
            features.push(
                format.readFeature(wktString, {
				    dataProjection: 'EPSG:4326',
					featureProjection: 'EPSG:3857'
                })
            );
        }catch(e){
            console.log("Unable to parse WKT ?!"+e)
        }
    if(!vectorLayer1){
        myVectorLayer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: features
            }),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: "#3333aa",
                    width: 1.4
                })
            })
        });
        map.addLayer(myVectorLayer);
    }
    else{
        vectorLayer1.getSource().clear();
        vectorLayer1.getSource().addFeatures(features);
    }
    console.log(vectorLayer1.getSource().getExtent());
    map.updateSize();
    map.getView().fit(vectorLayer1.getSource().getExtent(),map.getSize());
    hasAddedElement=1;
}

/*****************************************************************************
 * Show selected feature on map
 *****************************************************************************/
 var addSelectedIndex=0;
 var mySelectedElement=null;
function showElementOnMap(wktString){
    mySelectedElement=wktString;
    modalCallback=function(){
            //$("#myModal").find(".glyphicon-ok").parent().hide();
            if(addSelectedIndex==0){
                updateCurrentMapLocation();
                $("#currentPosition").html("<b>Position: "+position[bestIndex].lon.toFixed(6)+","+position[bestIndex].lat.toFixed(6)+"</b>");
            }
            addSelectedElement(mySelectedElement);
            $("#myModal").find("h4").html('<span class="glyphicon glyphicon-globe"></span> '+window.Android.translate("view_feature"));
            addSelectedIndex++;
    };
    //$("#currentPosition").html("<b>Position: "+position[bestIndex].lon.toFixed(6)+","+position[bestIndex].lat.toFixed(6)+"</b>");
    if(!$("#map").length)
    $.ajax({
        method: "GET",
        url: './map-modal.html',
        error: function(){
        },
        success: function(data){
            console.log(data);
            $("body").append(data);
            $("#map").css("height",($(window).height()-220)+"px");
            $('#myModal').modal();
            addOptionalLocalTiles(true);
            $('#myModal').on('shown.bs.modal', function () {
                console.log($("#mmm4me_ls").length);
                initMapToLocation();
                localTileIndex=map.getLayers().getLength();
                modalCallback();
            });
            $('#myModal').on('hide.bs.modal', function () {
                console.log("HIDE");
                stopTracking=true;
            });
        }
    });
    else{
        console.log("OK ");
        $('#myModal').modal();
        console.log("OK ");
        vectorLayer1.getSource().clear();
        console.log("OK ");
        updateCurrentMapLocation();
        console.log("OK ");
        addSelectedElement(wktString);
        console.log("OK ");
    }

        $("#currentPosition").html("<b>Position: "+position[bestIndex].lon.toFixed(6)+","+position[bestIndex].lat.toFixed(6)+"</b>");
}


/*****************************************************************************
 * Store the current GPS location in the edit form
 *****************************************************************************/
function requireGPSPosition(elem){
    var position=JSON.parse(window.Android.getGPS());
    //elem=$("#"+elem);
    if(position.lat){
        $(".btn_"+elem+"_lat").html(position.lat);
        $(".btn_"+elem+"_long").html(position.lon);
        $(".btn_"+elem+"_source").html(position.source);
        $("input[name='"+elem+"']").val("POINT("+position.lon+" "+position.lat+")");
    }else{

    }
    console.log(JSON.stringify(position));
}

/*****************************************************************************
 * Ajax setup to ensure seting "withCredentials" to true
 *****************************************************************************/
function ajaxSetup(){
    $.ajaxSetup({
      xhrFields: {
        withCredentials: true
      }
    });
}

/*****************************************************************************
 * Get the current Network and GPS availability
 *****************************************************************************/
function getCurrentStatus(){
    var tmp=JSON.parse(window.Android.getGNStatus());
    tmp["gps"]=JSON.parse(tmp["gps"]);
    updateStatus(tmp['gps'],tmp['net']);
}

/*****************************************************************************
 * Display the status icons
 *****************************************************************************/
function addStatusControl(){
    $('.breadcrumb').append('<span class="pull-right"><i class="glyphicon glyphicon-signal"></i> /'+
        '<span class="dropdown">'+
        '<i class="glyphicon glyphicon-map-marker dropdown-toggle" id="gpsMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"></i>'+
        '<ul class="dropdown-menu pull-right" aria-labelledby="gpsMenu1">'+
        '<li><a href="#">Not detected</a></li>'+
        '</ul>'+
        '</span>'+
        '</span>');
}

/*****************************************************************************
 * Initialize the map and show the current GPS location
 *****************************************************************************/
var localTiles;
function initMapToLocation(){
    if(map)
        return;
    var osmSource = new ol.source.OSM();
    localTiles = new ol.source.XYZ({
        tileLoadFunction:
        function(imageTile, src) {
            imageTile.getImage().src = "data:image/jpeg;base64,"+window.Android.displayTile(src);
        },
        attributions: [
            ol.source.OSM.ATTRIBUTION
        ],
        url: "{x},{-y},{z}",
        minZoom: 13,
        maxZoom: 19
    });

    var tmp=JSON.parse(window.Android.getGNStatus());
    var layers=[new ol.layer.Tile({source: localTiles})];
    console.log(JSON.stringify(tmp));
    if(tmp["net"])
        layers=[new ol.layer.Tile({
            source: osmSource
        })];
    map = new ol.Map({
        layers: layers,
        target: 'map',
        controls: ol.control.defaults({
            attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
		    collapsible: true
            })
        }),
        view: new ol.View({
            center: ol.proj.transform([0,0], 'EPSG:4326', 'EPSG:3857'),
            zoom: 14,
            maxZoom: 22,
            minZoom: 1
        })
    });

    var bstyle = function (feature, resolution) {

        /*var iconFont = 'glyphicon';
          var iconFontText = '\e062';*/
        //var iconFont = 'glyphicon';
        var iconFont = 'Glyphicons Halflings';
        var iconFontText = '\ue062';
        var iconSize = 24;
        var opacity=0.4;
        var col = 'rgba(0,255,0,0.6)';
        if(feature.get("source")=="GPS")
            col = 'rgba(41,136,54,0.5)';//#298836
        else if(feature.get("source")=="Network"){
            col = 'rgba(91,176,75,0.4)';//#5bb04b
            iconSize = 32;
            opacity=0.2;
        }
        else if(feature.get("source")=="other"){
            col='rgba(129,208,113,0.5)';//#81d071
            iconSize = 36;
            opacity=0.2;
        }
        else
            col='rgba(166,63,39,0.5)'; //#a63f27 //"#EE0000";
        var styles = [];

        var styleIcon = new ol.style.Style({
            text: new ol.style.Text({
                font: 'Normal ' + iconSize + 'px ' + iconFont,
                text: iconFontText,
                fill: new ol.style.Fill({ color: col })
            })
        });
        styles.push(styleIcon);

        //console.log(feature.get("type"));
        return styles;
        /*return function (feature, resolution) {
          styles.styleIcon.getText().setText(feature.get("iconCode"));
          return styles;
          };*/
    };
    position=JSON.parse(window.Android.getFullGPS());
    //console.log(JSON.stringify(position));
    if(position.length==0){
        position=[{lon:3.5,lat:43.5,source:"none"}];
    }
    var iconFeatures = [];
    for(var i=0;i<position.length;i++){
        iconFeatures.push(new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([position[i].lon,position[i].lat],
                                                          'EPSG:4326',
                                            			  'EPSG:3857')),
            source: position[i].source
        }));
        if(position[i].source=="GPS")
            bestIndex=i;
    }
    var vectorSource = new ol.source.Vector({
        features: iconFeatures //add an array of features
    });
    //console.log([position.lat, position.lon]);
    //console.log(ol.proj.transform([position.lat, position.lon], 'EPSG:4326','EPSG:3857'));
    vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: bstyle
    });
    vectorLayer1 = new ol.layer.Vector({
            source: new ol.source.Vector()
    });
    map.addLayer(vectorLayer);
    map.addLayer(vectorLayer1);
    //console.log(JSON.stringify(position));
    map.getView().setCenter(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326', 'EPSG:3857'));
    //console.log(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326', 'EPSG:3857'));
    //console.log(JSON.stringify(position));
}

/*****************************************************************************
 * Update the current loction of the map depending on the GPS location
 *****************************************************************************/
var bestIndex=0;
function updateCurrentMapLocation(){
    position=JSON.parse(window.Android.getFullGPS());
    console.log(JSON.stringify(position));
    if(position.length==0){
        position=[{lon:3.5,lat:43.5,source:"none"}];
    }
    var iconFeatures = [];
    for(var i=0;i<position.length;i++){
        iconFeatures.push(new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([position[i].lon,position[i].lat], 'EPSG:4326',
							  'EPSG:3857')),
            source: position[i].source
        }));
        if(position[i].source=="GPS")
            bestIndex=i;
    }
    vectorLayer.getSource().clear();
    vectorLayer.getSource().addFeatures(iconFeatures);
    map.getView().setCenter(ol.proj.transform([position[bestIndex].lon,position[bestIndex].lat], 'EPSG:4326', 'EPSG:3857'))
}


/*****************************************************************************
 * Display a dropdown that let user add their local tiles on top of OSMs
 *****************************************************************************/
var localTileIndex=0;
function addOptionalLocalTiles(shouldFixPosition){
    var tmp=JSON.parse(window.Android.getGNStatus());
    if(tmp["net"]){
        $.ajax({
            method: "GET",
            url: 'content/layer_switcher.html',
            success: function(data){
                if(MM4ME_DEBUG)
                    console.log('Display warning message on the UI !');
                $(".map").prepend(data);
                if(shouldFixPosition)
                    $("#mm4me_ls").css("margin-bottom","25px");

                $(".map").parent().find("input[type=range]").first().on('change',function(){
                    console.log("change to "+$(this).val());
                    map.getLayers().item(localTileIndex).setOpacity($(this).val()/100);
                });
                $(".map").parent().find("input[type=checkbox]").parent().on('click',function(){
                    var tmp=$(this).find("input[type=checkbox]");
                    if(tmp.is(":checked"))
                        $(this).find("input[type=checkbox]").prop("checked",false).change();
                    else
                        $(this).find("input[type=checkbox]").prop("checked",true).change();
                });
                $("#layerSwitcherCheck").on('change',function(){
                    if($(this).parent().find("i").hasClass("glyphicon-eye-open")){
                        $("#dmopacity").hide();
                        $(this).parent().find("i").removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
                        if(map.getLayers().getLength()>=4)
                            map.getLayers().item(localTileIndex).setVisible(false);
                    }else{
                        $(this).parent().find("i").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
                        $("#dmopacity").show();
                        console.log(JSON.stringify(map.getLayers().getLength()));
                        if(map.getLayers().getLength()<localTileIndex+1){
                            //map.addLayer(new ol.layer.Tile({source: localTiles}));
                            var myTileLayer=new ol.layer.Tile({source: localTiles});
                            var layers = map.getLayers();
                            layers.insertAt(1,myTileLayer);
                            //var myTileLayer=map.getLayers()[map.getLayers().getLength()-1];
                            //map.raiseLayer(myTileLaye, 1);
                            //map.setLayerIndex(myTileLayer,1);
                            //map.redraw();
                            localTileIndex=1;
                        }
                        else
                            map.getLayers().item(localTileIndex).setVisible(true);
                    }

                });
            },
            error: function(){
                alert("error fetching noserver.html file!");
            }
        });
    }
}

var oldBearer=0;
function reactOrientation(direction){
    if(map){
        if($("#followNorth").is(":checked"))
            window.Android.startReportDirection();
        else
            window.Android.stopReportDirection();
        console.log("******* ----- p "+oldBearer+" d "+direction+" diff "+(oldBearer-direction));
        if($("#followNorth").is(":checked") && (oldBearer-direction)<-0.05 || (oldBearer-direction)>0.05){
            map.getView().setRotation(-direction);
            oldBearer=direction;
        }
    }else{
        window.Android.stopReportDirection();
    }
}