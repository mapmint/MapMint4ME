package fr.geolabs.dev.mapmint4me;

import android.*;
import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
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
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.SyncStateContract;
import android.support.v4.app.ActivityCompat;
import android.support.v4.app.NotificationCompat;
import android.support.v4.app.NotificationManagerCompat;
import android.support.v4.content.ContextCompat;
import android.support.v4.content.FileProvider;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.os.Handler;
import android.support.v7.widget.AlertDialogLayout;
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
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static android.provider.MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE;
import static java.lang.Thread.sleep;




/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class MapMint4ME extends Activity implements
        LocationListener, GoogleApiClient.ConnectionCallbacks, GoogleApiClient.OnConnectionFailedListener,SensorEventListener {
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
    private NotificationManager mManager;
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

    private ScheduledThreadPoolExecutor mDialogDaemon;
    private WebAppInterface mWebAppInterface;

    private boolean upgradeMMGPS=false;

    public WebView getMyWebView() {
        return myWebView;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mLocationRequest = LocationRequest.create();
        setContentView(R.layout.activity_map_mint4_me);
        //mSensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        //mSensor = mSensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);

        if (mGoogleApiClient == null) {
            mGoogleApiClient = new GoogleApiClient.Builder(this)
                    .addConnectionCallbacks(this)
                    .addOnConnectionFailedListener(this)
                    .addApi(LocationServices.API)
                    .build();
            mGoogleApiClient.connect();
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, 1);
                }
        } catch (Exception e) {

        }
        if (savedInstanceState == null) {

            CookieManager mCookieManager = CookieManager.getInstance();
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            //getWindow().requestFeature(Window.FEATURE_NO_TITLE);
            setContentView(R.layout.activity_map_mint4_me);
            myLocationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            mSensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
            Sensor gsensor = mSensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            Sensor msensor = mSensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
            mSensorManager.registerListener(this, gsensor, SensorManager.SENSOR_DELAY_NORMAL);
            mSensorManager.registerListener(this, msensor, SensorManager.SENSOR_DELAY_NORMAL);

            myWebView = (WebView) findViewById(R.id.webView);
            myWebView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView webView, String webResourceRequest) {
                    if (Uri.parse(webResourceRequest).getScheme().equals("file")) {
                        webView.loadUrl(webResourceRequest);
                    } else {
                        // If the URI is not pointing to a local file, open with an ACTION_VIEW Intent
                        webView.getContext().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(webResourceRequest)));
                    }
                    return true; // in both cases we handle the link manually
                }
            });
            //myWebView.setWebViewClient(new WebViewClient() { @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error){ handler.proceed(); } });
            WebSettings webSettings = myWebView.getSettings();
            /*myWebView.setScrollBarStyle(WebView.SCROLLBARS_INSIDE_OVERLAY);
            myWebView.setVerticalScrollBarEnabled(false);*/
            webSettings.setGeolocationEnabled(true);
            webSettings.setAppCacheEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setJavaScriptEnabled(true);
            webSettings.setPluginState(WebSettings.PluginState.ON);
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
            mWebAppInterface = new WebAppInterface(this);
            myWebView.addJavascriptInterface(mWebAppInterface, "Android");
            myWebView.addJavascriptInterface(new LocalStorageJavaScriptInterface(this.getApplicationContext()), "LocalStorage");
            boolean isLang = Locale.getDefault().getLanguage().equals("fr");
            String filename;
            boolean hasPlay = false;
            /*if(isLang)
                filename="index-fr.html";
            else*/
            filename = "index.html";

            createNotificationChannel();

            myWebView.loadUrl("file:///android_asset/" + filename);
            if (mDialogDaemon != null) {
                mDialogDaemon.shutdown();
                mDialogDaemon = null;
            }


        }
        // ATTENTION: This was auto-generated to implement the App Indexing API.
        // See https://g.co/AppIndexing/AndroidStudio for more information.
        client = new GoogleApiClient.Builder(this).addApi(AppIndex.API).build();
        // ATTENTION: This was auto-generated to handle app links.
        Intent appLinkIntent = getIntent();
        String appLinkAction = appLinkIntent.getAction();
        Uri appLinkData = appLinkIntent.getData();
        if(appLinkData!=null) {
            Log.d(TAG, "appLinkData: " + appLinkData);
            Log.d(TAG, "appLinkAction: " + appLinkAction);
            Log.d(TAG, "appLinkAction: " + appLinkIntent.toUri(Intent.URI_INTENT_SCHEME));
            try {
                myWebView.loadUrl("file:///android_asset/map.html?mmGPS="+URLEncoder.encode(appLinkData.toString(),"utf-8"));
            } catch (UnsupportedEncodingException e) {
                e.printStackTrace();
            }
            upgradeMMGPS=true;
            //myWebView.loadUrl("javascript:setTimeout(function(){console.log('##### START !!!');upgradeMMGPS();},100);");
        }
    }

    private String channel_name="MapMint4ME";
    private String channel_description="MapMint4ME channel used for notification";
    public String CHANNEL_ID="MapMint4ME-11223344";


    public void createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = channel_name;
            String description = channel_description;
            int importance = NotificationManager.IMPORTANCE_LOW;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.setSound(null, null);
            // Register the channel with the system; you can't change the importance
            // or other notification behaviors after this
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    public boolean mInternetActivated=false;

    public boolean isInternetActivated(){
        return mInternetActivated;
    }

    @Override
    protected void onPostCreate(Bundle savedInstanceState) {
        super.onPostCreate(savedInstanceState);
    }

    protected void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, MapMint4ME.MY_PERMISSIONS_REQUEST_GPS);
            return;
        }
        LocationServices.FusedLocationApi.requestLocationUpdates(
                mGoogleApiClient, mLocationRequest, this);
    }

    @Override
    public void onConnected(Bundle connectionHint) {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, MapMint4ME.MY_PERMISSIONS_REQUEST_GPS);
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

    private SensorManager mSensorManager;
    @Override
    protected void onResume() {
        super.onResume();
        Sensor gsensor = mSensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        Sensor msensor = mSensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        mSensorManager.registerListener(this, gsensor, SensorManager.SENSOR_DELAY_NORMAL);
        mSensorManager.registerListener(this, msensor, SensorManager.SENSOR_DELAY_NORMAL);
    }

    @Override
    protected void onPause() {
        super.onPause();

        // to stop the listener and save battery
        mSensorManager.unregisterListener(this);
    }


    private float[] mGData = new float[3];
    private float[] mMData = new float[3];
    private float[] mR = new float[16];
    private float[] mI = new float[16];
    private float[] mOrientation = new float[3];
    private int mCount;
    private double mBearing;
    private boolean shouldReportDirection=false;

    public void startReportDirection(){
        shouldReportDirection=true;
    }
    public void stopReportDirection(){
        shouldReportDirection=false;
    }

    public void onSensorChanged(SensorEvent event) {
        if(mCount++>50) {
            int type = event.sensor.getType();
            float[] data;
            if (type == Sensor.TYPE_ACCELEROMETER) {
                data = mGData;
            } else if (type == Sensor.TYPE_MAGNETIC_FIELD) {
                data = mMData;
            /*Log.d("North", "0: " + event.values[0] +
                    "  1: " + event.values[1] +
                    "  2: " + event.values[2]
            );*/
            } else {
                // we should not be here.
                return;
            }
            for (int i = 0; i < 3; i++)
                data[i] = event.values[i];
            SensorManager.getRotationMatrix(mR, mI, mGData, mMData);
// some test code which will be used/cleaned up before we ship this.
//        SensorManager.remapCoordinateSystem(mR,
//                SensorManager.AXIS_X, SensorManager.AXIS_Z, mR);
//        SensorManager.remapCoordinateSystem(mR,
//                SensorManager.AXIS_Y, SensorManager.AXIS_MINUS_X, mR);
            SensorManager.getOrientation(mR, mOrientation);
            float incl = SensorManager.getInclination(mI);
        /*if (mCount++ > 50) {
            final float rad2deg = (float)(180.0f/Math.PI);
            mCount = 0;
            /*Log.d("Compass", "yaw: " + (int)(mOrientation[0]*rad2deg) +
                    "  pitch: " + (int)(mOrientation[1]*rad2deg) +
                    "  roll: " + (int)(mOrientation[2]*rad2deg) +
                    "  incl: " + (int)(incl*rad2deg)
            );* /

        }*/
            if (mLastLocation != null) {
                GeomagneticField geomagneticField = new GeomagneticField(
                        (float) mLastLocation.getLatitude(),
                        (float) mLastLocation.getLongitude(),
                        (float) mLastLocation.getAltitude(),
                        System.currentTimeMillis());
                double bearing = mOrientation[0];
                bearing = Math.toDegrees(bearing);
                if (geomagneticField != null) {
                    bearing += geomagneticField.getDeclination();
                }
                if (bearing < 0) {
                    bearing += 360;
                }
                //double oldBearing = mBearing;
                mBearing = Math.toRadians(bearing);
                //Log.d("North", "angle: " + mBearing);
                /*if (!(mBearing<oldBearing+)mBearing!=oldBearing) */
                /*if(mCount++>25)*/
                {
                    myWebView.loadUrl("javascript:reactOrientation(" + mBearing + ");");
                    //mCount = 0;
                }
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // not in use
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
                myWebView.loadUrl("javascript:console.log('error ! " + resultCode + "');");
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
                myWebView.loadUrl("javascript:console.log('error ! " + resultCode + "');");
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
                //Toast.makeText(getApplicationContext(), "Error : " + ex, Toast.LENGTH_LONG).show();
            }
            // Continue only if the File was successfully created
            if (photoFile != null) {
                Uri photoURI = FileProvider.getUriForFile(getApplicationContext(),
                        "fr.geolabs.dev.fileprovider",
                        photoFile);
                //takePictureIntent.setData(photoURI);
                takePictureIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                String packageName0 = takePictureIntent.getPackage();
                //Toast.makeText(getBaseContext(), "Authorize Package 0  : " + packageName0, Toast.LENGTH_SHORT).show();
                List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(takePictureIntent, PackageManager.MATCH_DEFAULT_ONLY);
                for (ResolveInfo resolveInfo : resInfoList) {
                    String packageName = resolveInfo.activityInfo.packageName;
                    //Toast.makeText(getApplicationContext(), "Authorize Package 1 : " + packageName, Toast.LENGTH_LONG).show();
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
                //Toast.makeText(getApplicationContext(), "Authorize Package 1 : " + packageName, Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                int permissionCheck = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE);
                //Toast.makeText(getApplicationContext(), "Authorize Package 2 : " + packageName, Toast.LENGTH_LONG).show();

                if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, MY_PERMISSIONS_REQUEST_READ_MEDIA);
                    //Toast.makeText(getApplicationContext(), "Authorize Package 2 : " + packageName, Toast.LENGTH_LONG).show();
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
                    Log.d(TAG, "Allowed to access the media!!");
                }
                break;
            case MY_PERMISSIONS_REQUEST_GPS:
                if ((grantResults.length > 0) && (grantResults[0] == PackageManager.PERMISSION_GRANTED)) {
                    Log.d(TAG, "Allowed to access the gps!!");
                }
                break;
            default:
                if ((grantResults.length > 0) && (grantResults[0] == PackageManager.PERMISSION_GRANTED)) {
                    Log.d(TAG, "Allowed to access "+permissions[0]+"!!");
                }
                break;
        }
    }
}
