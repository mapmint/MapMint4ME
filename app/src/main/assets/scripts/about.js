var texts=[
    "about_intro",
    "about_property"
];
for(var i=0;i<texts.length;i++)
$("#"+texts[i]).html(window.Android.translate(texts[i]));
