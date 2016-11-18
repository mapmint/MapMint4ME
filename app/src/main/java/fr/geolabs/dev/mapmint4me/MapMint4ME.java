package fr.geolabs.dev.mapmint4me;

import android.*;
import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.SyncStateContract;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v4.content.FileProvider;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.os.Handler;
import android.text.format.DateFormat;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.CookieSyncManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.google.android.gms.appindexing.Action;
import com.google.android.gms.appindexing.AppIndex;
import com.google.android.gms.appindexing.Thing;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.location.LocationListener;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

import static android.provider.MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class MapMint4ME extends Activity implements
        LocationListener, GoogleApiClient.ConnectionCallbacks, GoogleApiClient.OnConnectionFailedListener {
    /**
     * Whether or not the system UI should be auto-hidden after
     * {@link #AUTO_HIDE_DELAY_MILLIS} milliseconds.
     */
    private static final boolean AUTO_HIDE = true;

    //print CookieManager mCookieManager;

    /**
     * If {@link #AUTO_HIDE} is set, the number of milliseconds to wait after
     * user interaction before hiding the system UI.
     */
    private static final int AUTO_HIDE_DELAY_MILLIS = 3000;

    /**
     * Some older devices needs a small delay between UI widget updates
     * and a change of the status and navigation bar.
     */
    private static final int UI_ANIMATION_DELAY = 300;
    private final Handler mHideHandler = new Handler();

    private View mContentView;
    private GoogleApiClient mGoogleApiClient = null;
    private WebView myWebView;
    public LocationManager myLocationManager = null;
    private Location mLastLocation;
    private LocationRequest mLocationRequest;
    private String TAG = "MapMint4ME";
    private final Runnable mHidePart2Runnable = new Runnable() {
        @SuppressLint("InlinedApi")
        @Override
        public void run() {
            // Delayed removal of status and navigation bar

            // Note that some of these constants are new as of API 16 (Jelly Bean)
            // and API 19 (KitKat). It is safe to use them, as they are inlined
            // at compile-time and do nothing on earlier devices.
            mContentView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LOW_PROFILE
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION);
        }
    };
    /**
     * Touch listener to use for in-layout UI controls to delay hiding the
     * system UI. This is to prevent the jarring behavior of controls going away
     * while interacting with activity UI.
     */
    private final View.OnTouchListener mDelayHideTouchListener = new View.OnTouchListener() {
        @Override
        public boolean onTouch(View view, MotionEvent motionEvent) {
            if (AUTO_HIDE) {
                //delayedHide(AUTO_HIDE_DELAY_MILLIS);
            }
            return false;
        }
    };
    /**
     * ATTENTION: This was auto-generated to implement the App Indexing API.
     * See https://g.co/AppIndexing/AndroidStudio for more information.
     */
    private GoogleApiClient client;

    public CookieManager getCookies() {
        return CookieManager.getInstance();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mLocationRequest = LocationRequest.create();
        setContentView(R.layout.activity_map_mint4_me);


        if (mGoogleApiClient == null) {
            mGoogleApiClient = new GoogleApiClient.Builder(this)
                    .addConnectionCallbacks(this)
                    .addOnConnectionFailedListener(this)
                    .addApi(LocationServices.API)
                    .build();
            mGoogleApiClient.connect();
        }
        if (savedInstanceState == null) {

            CookieManager mCookieManager = CookieManager.getInstance();
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            //getWindow().requestFeature(Window.FEATURE_NO_TITLE);
            setContentView(R.layout.activity_map_mint4_me);
            myLocationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            myWebView = (WebView) findViewById(R.id.webView);
            //myWebView.setWebViewClient(new WebViewClient() { @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error){ handler.proceed(); } });
            WebSettings webSettings = myWebView.getSettings();
            /*myWebView.setScrollBarStyle(WebView.SCROLLBARS_INSIDE_OVERLAY);
            myWebView.setVerticalScrollBarEnabled(false);*/
            webSettings.setGeolocationEnabled(true);
            webSettings.setAppCacheEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setJavaScriptEnabled(true);
            webSettings.setDomStorageEnabled(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mCookieManager.setAcceptThirdPartyCookies(myWebView, true);
            }
            try {
                webSettings.setAllowUniversalAccessFromFileURLs(true);
            } catch (NoSuchMethodError e) {
                Log.d(TAG, "Not able to call setAllowUniversalAccessFromFileURLs.");
            }
            String databasePath = myWebView.getContext().getDir("databases",
                    Context.MODE_PRIVATE).getPath();
            //webSettings.setGeolocationDatabasePath(databasePath);
            WebChromeClient webChromeClient = new WebChromeClass();
            myWebView.setWebChromeClient(webChromeClient);
            myWebView.addJavascriptInterface(new WebAppInterface(this), "Android");
            myWebView.addJavascriptInterface(new LocalStorageJavaScriptInterface(this.getApplicationContext()), "LocalStorage");
            boolean isLang = Locale.getDefault().getLanguage().equals("fr");
            String filename;
            boolean hasPlay = false;
            /*if(isLang)
                filename="index-fr.html";
            else*/
            filename = "index.html";
            myWebView.loadUrl("file:///android_asset/" + filename);
        }

        // ATTENTION: This was auto-generated to implement the App Indexing API.
        // See https://g.co/AppIndexing/AndroidStudio for more information.
        client = new GoogleApiClient.Builder(this).addApi(AppIndex.API).build();
    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
    }

    protected void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
            return;
        }
        LocationServices.FusedLocationApi.requestLocationUpdates(
                mGoogleApiClient, mLocationRequest, this);
    }

    @Override
    public void onConnected(Bundle connectionHint) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
            return;
        }
        mLastLocation = LocationServices.FusedLocationApi.getLastLocation(mGoogleApiClient);
        startLocationUpdates();
        Log.d(TAG, "******** onConnected() called. " + mLastLocation + " ******");
    }

    @Override
    public void onLocationChanged(Location location) {
        mLastLocation = location;
        Log.d(TAG, "******** onLocationChanged() called. " + mLastLocation + " ******");
    }

    @Override
    public void onConnectionSuspended(int i) {
        Log.d(TAG, "onConnectionSuspended() called.");
    }

    @Override
    public void onConnectionFailed(ConnectionResult result) {
        Log.d(TAG, "onConnectionFailed() called.");
    }

    /**
     * ATTENTION: This was auto-generated to implement the App Indexing API.
     * See https://g.co/AppIndexing/AndroidStudio for more information.
     */
    public Action getIndexApiAction() {
        Thing object = new Thing.Builder()
                .setName("MapMint4ME Page") // TODO: Define a title for the content shown.
                // TODO: Make sure this auto-generated URL is correct.
                .setUrl(Uri.parse("http://[ENTER-YOUR-URL-HERE]"))
                .build();
        return new Action.Builder(Action.TYPE_VIEW)
                .setObject(object)
                .setActionStatus(Action.STATUS_TYPE_COMPLETED)
                .build();
    }

    @Override
    public void onStart() {
        super.onStart();

        // ATTENTION: This was auto-generated to implement the App Indexing API.
        // See https://g.co/AppIndexing/AndroidStudio for more information.
        client.connect();
        AppIndex.AppIndexApi.start(client, getIndexApiAction());
    }

    @Override
    public void onStop() {
        super.onStop();

        // ATTENTION: This was auto-generated to implement the App Indexing API.
        // See https://g.co/AppIndexing/AndroidStudio for more information.
        AppIndex.AppIndexApi.end(client, getIndexApiAction());
        client.disconnect();
    }


    /**
     * This class is used as a substitution of the local storage in Android webviews
     */
    private class LocalStorageJavaScriptInterface {
        private Context mContext;
        private LocalStorage localStorageDBHelper;
        private SQLiteDatabase database;

        LocalStorageJavaScriptInterface(Context c) {
            mContext = c;
            localStorageDBHelper = LocalStorage.getInstance(mContext);
        }

        /**
         * This method allows to get an item for the given key
         *
         * @param key : the key to look for in the local storage
         * @return the item having the given key
         */
        @JavascriptInterface
        public String getItem(String key) {
            String value = null;
            if (key != null) {
                database = localStorageDBHelper.getReadableDatabase();
                Cursor cursor = database.query(LocalStorage.LOCALSTORAGE_TABLE_NAME,
                        null,
                        LocalStorage.LOCALSTORAGE_ID + " = ?",
                        new String[]{key}, null, null, null);
                if (cursor.moveToFirst()) {
                    value = cursor.getString(1);
                }
                cursor.close();
                database.close();
            }
            return value;
        }

        /**
         * set the value for the given key, or create the set of datas if the key does not exist already.
         *
         * @param key
         * @param value
         */
        @JavascriptInterface
        public void setItem(String key, String value) {
            if (key != null && value != null) {
                String oldValue = getItem(key);
                database = localStorageDBHelper.getWritableDatabase();
                ContentValues values = new ContentValues();
                values.put(LocalStorage.LOCALSTORAGE_ID, key);
                values.put(LocalStorage.LOCALSTORAGE_VALUE, value);
                if (oldValue != null) {
                    database.update(LocalStorage.LOCALSTORAGE_TABLE_NAME, values, LocalStorage.LOCALSTORAGE_ID + " = " + key, null);
                } else {
                    database.insert(LocalStorage.LOCALSTORAGE_TABLE_NAME, null, values);
                }
                database.close();
            }
        }

        /**
         * removes the item corresponding to the given key
         *
         * @param key
         */
        @JavascriptInterface
        public void removeItem(String key) {
            if (key != null) {
                database = localStorageDBHelper.getWritableDatabase();
                database.delete(LocalStorage.LOCALSTORAGE_TABLE_NAME, LocalStorage.LOCALSTORAGE_ID + " = " + key, null);
                database.close();
            }
        }

        /**
         * clears all the local storage.
         */
        @JavascriptInterface
        public void clear() {
            database = localStorageDBHelper.getWritableDatabase();
            database.delete(LocalStorage.LOCALSTORAGE_TABLE_NAME, null, null);
            database.close();
        }
    }

    public class WebChromeClass extends WebChromeClient {
        @Override
        public void onGeolocationPermissionsShowPrompt(String origin,
                                                       GeolocationPermissions.Callback callback) {
            // Always grant permission since the app itself requires location
            // permission and the user has therefore already granted it
            callback.invoke(origin, true, false);
        }
    }

    public LocationManager getLocationManager() {
        return myLocationManager;
    }

    public Location getLastLocation() {
        return mLastLocation;
    }


    private static final int CAMERA_REQUEST = 1888;

    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_TAKE_PHOTO) {
            if (resultCode == Activity.RESULT_OK)
                myWebView.loadUrl("javascript:loadNewPicture('" + cameraPictureCid + "','" + cameraPictureId + "','" + cameraPictureName + "');");
            else {
                myWebView.loadUrl("javascript:console.log('error ! " + data.getData() + "');");
            }
        }
        if (requestCode == PICK_IMAGE) {
            if (resultCode == Activity.RESULT_OK) {
                try {
                    InputStream in = getContentResolver().openInputStream(data.getData());
                    File asset_dir = new File(getFilesDir() + File.separator + "data");
                    File myOutputFile=createImageFile();
                    Uri outputURI = FileProvider.getUriForFile(getApplicationContext(),
                            "fr.geolabs.dev.fileprovider",
                            myOutputFile);
                    cameraPictureName = outputURI.toString();
                    FileOutputStream fos = new FileOutputStream(myOutputFile);
                    BufferedOutputStream bout = new BufferedOutputStream(fos, 1024);
                    byte[] data1 = new byte[1024];
                    int x = 0;
                    while ((x = in.read(data1, 0, 1024)) >= 0) {
                        bout.write(data1, 0, x);
                    }
                    fos.flush();
                    bout.flush();
                    fos.close();
                    bout.close();
                    in.close();
                    myWebView.loadUrl("javascript:loadNewPicture('" + cameraPictureCid + "','" + cameraPictureId + "','" + cameraPictureName + "');");
                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(), "Error : " + e, Toast.LENGTH_LONG).show();
                    myWebView.loadUrl("javascript:console.log('" + e + "');");
                }

            } else {
                myWebView.loadUrl("javascript:console.log('error ! " + data.getData() + "');");
            }
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    String cameraPictureId = null;
    String cameraPictureCid = null;
    String cameraPictureName = null;
    String mCurrentPhotoPath;

    private File createImageFile() throws IOException {
        // Create an image file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String imageFileName = "JPEG_" + timeStamp + ".jpg";
        File storageDir = new File(getFilesDir(), "Android/data/fr.geolabs.dev.mapmint4me/files/Pictures");


        //Create directories in case they do not exist
        if (!storageDir.exists()) storageDir.mkdirs();
        File image = new File(storageDir, imageFileName);


        // Save a file: path for use with ACTION_VIEW intents
        mCurrentPhotoPath = "file:" + image.getAbsolutePath();
        return image;
    }

    static final int REQUEST_TAKE_PHOTO = 1221;
    static final int PICK_IMAGE = 1222;

    public void invokeCamera(String id, String cid) {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        // Ensure that there's a camera activity to handle the intent
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            // Create the File where the photo should go
            File photoFile = null;
            try {
                photoFile = createImageFile();
            } catch (IOException ex) {
                // Error occurred while creating the File
                //...
                Toast.makeText(getApplicationContext(), "Error : " + ex, Toast.LENGTH_LONG).show();
            }
            // Continue only if the File was successfully created
            if (photoFile != null) {
                Uri photoURI = FileProvider.getUriForFile(getApplicationContext(),
                        "fr.geolabs.dev.fileprovider",
                        photoFile);
                //takePictureIntent.setData(photoURI);
                takePictureIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                String packageName0 = takePictureIntent.getPackage();
                Toast.makeText(getBaseContext(), "Authorize Package 0  : " + packageName0, Toast.LENGTH_SHORT).show();
                List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(takePictureIntent, PackageManager.MATCH_DEFAULT_ONLY);
                for (ResolveInfo resolveInfo : resInfoList) {
                    String packageName = resolveInfo.activityInfo.packageName;
                    Toast.makeText(getApplicationContext(), "Authorize Package 1 : " + packageName, Toast.LENGTH_LONG).show();
                    getApplicationContext().grantUriPermission(packageName, photoURI, Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                cameraPictureId = id;
                cameraPictureCid = cid;
                cameraPictureName = photoURI.toString();
                startActivityForResult(takePictureIntent, REQUEST_TAKE_PHOTO);
            }
        }
    }

    public void invokePickupImage(String id, String cid) {
        Intent getIntent = new Intent(Intent.ACTION_GET_CONTENT);
        getIntent.setType("image/*");

        Intent pickIntent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        pickIntent.setType("image/*");

        Intent chooserIntent = Intent.createChooser(getIntent, "Select Image");
        chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{pickIntent});

        cameraPictureId = id;
        cameraPictureCid = cid;

        List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(pickIntent, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo resolveInfo : resInfoList) {
            String packageName = resolveInfo.activityInfo.packageName;
            //Toast.makeText(getApplicationContext(), "Authorize Package 1 : " + packageName, Toast.LENGTH_LONG).show();
            getApplicationContext().grantUriPermission(packageName, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }

        resInfoList = getPackageManager().queryIntentActivities(getIntent(), PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo resolveInfo : resInfoList) {
            String packageName = resolveInfo.activityInfo.packageName;
            //Toast.makeText(getApplicationContext(), "Authorize Package 1 : " + packageName, Toast.LENGTH_LONG).show();
            try {
                getApplicationContext().grantUriPermission(packageName, MediaStore.Images.Media.EXTERNAL_CONTENT_URI, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception e) {
                int permissionCheck = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE);

                if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, MY_PERMISSIONS_REQUEST_READ_MEDIA);
                }
            }
        }
        startActivityForResult(chooserIntent, PICK_IMAGE);
    }

    public static final int MY_PERMISSIONS_REQUEST_READ_MEDIA = 1233456666;
    public static final int MY_PERMISSIONS_REQUEST_GPS = 1233456667;

    @Override
    public void onRequestPermissionsResult(int requestCode, String permissions[], int[] grantResults) {
        switch (requestCode) {
            case MY_PERMISSIONS_REQUEST_READ_MEDIA:
                if ((grantResults.length > 0) && (grantResults[0] == PackageManager.PERMISSION_GRANTED)) {
                    Log.d(TAG, "Allowed to access the data!!");
                }
                break;
            case MY_PERMISSIONS_REQUEST_GPS:
                if ((grantResults.length > 0) && (grantResults[0] == PackageManager.PERMISSION_GRANTED)) {
                    Log.d(TAG, "Allowed to access the data!!");
                }
                break;
            default:
                break;
        }
    }
}
