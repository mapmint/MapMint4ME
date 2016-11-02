var MM4ME_DEBUG=false;
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

/*****************************************************************************
 * List all available table for a given theme
 *****************************************************************************/
function fetchTableForTheme(obj,id){
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
    }
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
            fetchTableForTheme(allThemes[allThemes.length-1],themes_0[i]["id"]);
        }
        $(".mm4me_content").append('<div id="tree"></div>');
        $('#tree').treeview({
            data: allThemes,
            onNodeSelected: function(event, data) {
                try{
                    func(data["myId"],data["myName"],data["myTitle"],true);
                }catch(e){
                    window.Android.showToast(e);
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
                .html('<img class="img-responsive" src="'+picture+'" title="'+
                        window.Android.translate('image')+'" width="100%" />');
    });
}


/*****************************************************************************
 * Create a JSON Object representing the dependency values.
 *****************************************************************************/
function fetchDependencies(obj,cid,changingField){
    var list1=null;
    for(var key in changingField){
        for(var i=0;i<changingField[key]["dep"].length;i++){
            for(var ckey in changingField[key]["dep"][i]){
                var req="select * from mm4me_edition_fields where mm4me_edition_fields.edition>0 and name='"+ckey+"' and eid="+obj["eid"]+" order by mm4me_edition_fields.id asc";
                list1=JSON.parse(window.Android.displayTable(req,[]));
                changingField[key]["dep"][i][ckey]["values"]=[];
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
    //console.log(cid+" "+JSON.stringify(changingField));
}


/*****************************************************************************
 * Display an HTML part containing the input corresponding to a given type.
 *****************************************************************************/
function printCurrentType(obj,cid){
    if(definedSqlTypes.length==0){
        definedSqlTypes=JSON.parse(window.Android.displayTable("select id,code from mm4me_ftypes where ftype='e' order by name",[]));
        console.log(JSON.stringify(definedSqlTypes));
    }
    for(var i in definedSqlTypes){
        if(definedSqlTypes[i]["id"]==obj["ftype"]){
            if(definedSqlTypes[i]["code"]=="bytea"){
                var tmpStr="";
                tmpStr+='<div class="dropdown">'+
                        '   <button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">'+
                        '      '+
                        '     <span class="caret"></span>'+
                        '   </button>'+
                        '   <ul class="dropdown-menu" aria-labelledby="dropdownMenu1">'+
                        //'     <li><a href="#" onclick="var tmp=window.Android.getGPS();alert(tmp.lat+'+"' '"+'+tmp.lon);"><i class="glyphicon glyphicon-pencil"></i></a></li>'+
                        '     <li><a href="#"  onclick="window.Android.pickupImage('+obj["id"]+','+cid+');"><i class="glyphicon glyphicon-picture"></i> '+window.Android.translate("choose_picture")+'</a></li>'+
                        '     <li role="separator" class="divider"></li>'+
                        '     <li><a href="#" onclick="window.Android.queryCamera('+obj["id"]+','+cid+');"><i class="glyphicon glyphicon-camera"></i> '+window.Android.translate("take_picture")+'</a></li>'+
                        '   </ul>'+
                        '</div> <div id="value_'+obj["id"]+'"></div>';
                return tmpStr;
            }
            if(definedSqlTypes[i]["code"]=="geometry"){
                return '<a href="#" onclick="window.Android.getGPS();"><i class="glyphicon glyphicon-map-marker"></i>'+window.Android.translate("use_gps")+'</a>';
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
                    $.ajax({
                        async: false,
                        method: "GET",
                        url: './content/view_template.html',
                        error: function(){
                            console.log("Nothing to run after");
                        },
                        success: function(data){
                            console.log("**** \n\n Load View Template");
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
                            strReturn=data.replace(reg,refs["0"]["tid"]);
                        }
                    });
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
                    fetchDependencies(obj,cid,changingFields[changingFields.length-1]);
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
        var found=false;
        for(var i in editSchema[mid]){
            for(var j in editSchema[mid][i]){
                if(editSchema[mid][i][j]["id"]==cid){
                    if(editSchema[mid][i][j]["name"].indexOf("unamed")<0){
                    if(MM4ME_DEBUG)
                        console.log(editSchema[mid][i][j]["name"]+" <> "+$(this).val());
                    queryAttr.push(editSchema[mid][i][j]["name"]);
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
            if(editSchema[mid][i][j]["ftype"]==EDITION_TYPE_FILE){
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
    func(mid);

}

/*****************************************************************************
 * Execute an Update SQL query for a given table
 *****************************************************************************/
function runUpdateQuery(obj,mid,func){
    var query="UPDATE "+cleanupTableName(allTables[mid].name)+" set ";
    var queryAttr=[];
    var queryValues0=[];
    var queryValues=[];
    var queryTypes=[];
    var lastValue=$("#exampleTable"+((mid==mtable)?"":"_"+mid)).find(".selected").find('input[type=hidden]').first().val();
    var ccol=getPKey(cleanupTableName(allTables[mid].name));
    var queryEnd=" WHERE "+ccol+"=?";
    var lcnt=0;
    $(obj).find("input,select,textarea").each(function(){
        if(MM4ME_DEBUG)
            console.log($(this).attr("name")+" <> "+$(this).val());
        try{
        var cid=$(this).attr("name").replace(/field_/g,"");
        var found=false;
        for(var i in editSchema[mid]){
            for(var j in editSchema[mid][i]){
                if(editSchema[mid][i][j]["id"]==cid){
                    if(editSchema[mid][i][j]["name"].indexOf("unamed")<0){
                    if(MM4ME_DEBUG)
                        console.log(editSchema[mid][i][j]["name"]+" <> "+$(this).val());
                    query+=(lcnt>0?", ":"")+editSchema[mid][i][j]["name"]+"=?";
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
            if(editSchema[mid][i][j]["ftype"]==EDITION_TYPE_FILE){
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

    var list=window.Android.displayTable("select mm4me_editions.id,mm4me_editions.name from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+tblId+" and step>=0 order by mm4me_editions.id asc",[]);
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
        $(".breadcrumb").append('<li><a href="view.html"><span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span> '+window.Android.translate('view')+'</a></li>');
        $(".breadcrumb").append('<li class="active"><span class="glyphicon glyphicon-list" aria-hidden="true"></span> '+tblTitle+'</a></li>');
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
        sqlColumns+=cleanupTableName(list[i]["value"])+" as "+list[i]["name"];
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
        $('#'+localName).DataTable( {
            data: dataSet,
            columns: columns,
            "scrollX": true,
            scrollY:        '50vh',
            scrollCollapse: true,
            select: true
        } );
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

    for(var i=0;i<changingFields.length;i++){
        for(var key in changingFields[i]){
            var localFunc=function(changingField){
                return function(){
                    for(var j=0;j<changingField.length;j++){
                        for(var ckey in changingField[j]){
                            var i=0;
                            $(this).parent().parent().parent().find("select[name=field_"+changingField[j][ckey]["id"]+"]").html("");
                            var cIndex=changingField[j][ckey]["options"].indexOf($(this).val());
                            //window.Android.showToast(cIndex+" "+changingField[j][ckey]["values"][cIndex]);
                            var cnt0=0;
                            for(i=0;i<changingField[j][ckey]["values"][cIndex].length;i++){
                                var cnt=0;
                                var cStr="<option ";
                                for(var lkey in changingField[j][ckey]["values"][cIndex][i]){
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
    $('.mm4me_listing').show();
    $('.mm4me_content').hide();
}

/*****************************************************************************
 * Display the content of a table referencing the current edited table.
 *****************************************************************************/
function listInnerTable(id,vid,name,title,init,prefix,clause,ref){
    var list=JSON.parse(window.Android.displayTable("select mm4me_tables.id as tid,mm4me_tables.name as tname,mm4me_editions.id,mm4me_editions.name from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+id+" order by mm4me_editions.id asc",[]));
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

    $('#'+localName).DataTable( {
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
        } );
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
    for(var i in editSchema[cid]){
        for(var j in editSchema[cid][i]){
            if(editSchema[cid][i][j]["name"].indexOf("unamed")<0)
                fields.push(editSchema[cid][i][j]["name"]+" AS \""+editSchema[cid][i][j]["id"]+"\"");
        }
    }
    var ccol=getPKey(cleanupTableName(allTables[cid].name));
    /* $("#exampleTable"+(cid==mtable?"":"_"+cid)).find(".selected").find('input[type=hidden]').first().val() */
    var editValues=window.Android.displayTable("select "+ccol+" as local_id,"+fields.join(", ")+" from "+cleanupTableName(allTables[cid].name)+" where "+ccol+"="+selectedId,[]);
    editValues=JSON.parse(editValues);

    for(var i in editValues){
        referenceIds[cid]=editValues[i]["local_id"];
        for(var j in editValues[i]){
            if($("#value_"+j).length){
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
 * The fucntion to call at the end of insert or update query (edit only)
 *****************************************************************************/
function editOnlyTableReact(tid){
    var mid=tid;
    if(MM4ME_DEBUG)
        console.log("editTableReact("+mid+')');
    if(mid==mtable){
        $('.mm4me_listing').find('ul').first().find('a').first().click();
        var ccol=getPKey(cleanupTableName(allTables[mid].name));
        var list=JSON.parse(window.Android.displayTable("select max("+ccol+") as val from "+cleanupTableName(allTables[mid].name),[]));
        $(".require-select").show();
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

    var list=window.Android.displayTable("select mm4me_editions.id,mm4me_editions.name from mm4me_editions,mm4me_tables where mm4me_editions.ptid=mm4me_tables.id and mm4me_tables.id="+tblId+" and step>=0 order by mm4me_editions.id asc",[]);
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

    var aCnt=0;
    $('.mm4me_edition').find('ul').find('a').each(function () {
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

    for(var i=0;i<changingFields.length;i++){
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
    }
    $('.mm4me_listing').show();
    $('.mm4me_content').hide();

}

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