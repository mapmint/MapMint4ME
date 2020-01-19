package fr.geolabs.dev.mapmint4me;

import android.*;
import android.accounts.Account;
import android.accounts.AccountManager;
import android.annotation.TargetApi;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Point;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.support.v4.app.ActivityCompat;
import android.support.v4.app.NotificationCompat;
import android.support.v4.app.NotificationManagerCompat;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import android.util.Patterns;
import android.view.Display;
import android.view.Gravity;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.HttpCookie;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;


public class WebAppInterface {
    private boolean mCenter = false;
    private Context mContext;
    private String errorMsg;

    /**
     * Instantiate the interface and set the context
     */
    WebAppInterface(Context c) {
        mContext = c;
    }

    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public void setToastToCenter(boolean center) {
        mCenter = center;
    }

    /**
     * Show a toast from the web page
     */
    @JavascriptInterface
    public void showToast(String toast) {
        Toast ltoast = Toast.makeText(mContext, toast, Toast.LENGTH_LONG);
        if (mCenter)
            ltoast.setGravity(Gravity.CENTER_VERTICAL | Gravity.CENTER_HORIZONTAL, 0, 0);
        ltoast.show();
    }

    private NotificationManager mManager;
    private int currentId=0;

    /**
     * Show a toast from the web page
     */
    @JavascriptInterface
    public void notify(String msg) {
        //mContext.createNotificationChannel();
        Intent intent = new Intent(mContext, MapMint4ME.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(mContext, 0, intent, 0);

        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(mContext, ((MapMint4ME)mContext).CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("My notification")
                .setContentText(msg)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(msg))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
                // Set the intent that will fire when the user taps the notification
                //.setContentIntent(pendingIntent);
                //.setAutoCancel(true);

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(mContext);
        currentId++;
        notificationManager.notify(currentId, mBuilder.build());
    }

    @JavascriptInterface
    public boolean getInternetStatus() {
        return ((MapMint4ME) mContext).isInternetActivated();
    }

    @JavascriptInterface
    public String getFullGPS() throws Exception {

        int permissionCheck = ContextCompat.checkSelfPermission(mContext, android.Manifest.permission.ACCESS_FINE_LOCATION);

        if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(((MapMint4ME) mContext), new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, MapMint4ME.MY_PERMISSIONS_REQUEST_GPS);
        }

        boolean hasPosition = false;
        // flag for GPS status
        boolean isGPSEnabled = false;

        // flag for network status
        boolean isNetworkEnabled = false;

        Location location = null; // location

        // The minimum distance to change Updates in meters
        final long MIN_DISTANCE_CHANGE_FOR_UPDATES = 1; // 10 meters

        // The minimum time between updates in milliseconds
        final long MIN_TIME_BW_UPDATES = 1000 * 60 * 1; // 1 minute

        LocationManager myLocationManager;
        myLocationManager = ((MapMint4ME) mContext).getLocationManager();

        // getting GPS status
        isGPSEnabled = myLocationManager
                .isProviderEnabled(LocationManager.GPS_PROVIDER);

        // getting network status
        isNetworkEnabled = myLocationManager
                .isProviderEnabled(LocationManager.NETWORK_PROVIDER);

        String source = null;
        JSONArray jsonArray = new JSONArray();
        if (isNetworkEnabled) {
            myLocationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER, 0, 0, new LocationListener() {
                        @Override
                        public void onStatusChanged(String provider, int status, Bundle extras) {
                        }

                        @Override
                        public void onProviderEnabled(String provider) {
                        }

                        @Override
                        public void onProviderDisabled(String provider) {
                        }

                        @Override
                        public void onLocationChanged(final Location location) {
                        }
                    });
            source = "Network";
            Log.d("Network", "Network");
            if (myLocationManager != null) {
                location = myLocationManager
                        .getLastKnownLocation(myLocationManager.NETWORK_PROVIDER);
                hasPosition = true;
                JSONObject json = new JSONObject();
                if (location != null && hasPosition) {
                    json.put("lat", location.getLatitude());
                    json.put("lon", location.getLongitude());
                    json.put("source", source);
                    jsonArray.put(jsonArray.length(), json);
                }
            }
        }
        if (isGPSEnabled) {
            myLocationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER, 0, 0, new LocationListener() {
                        @Override
                        public void onStatusChanged(String provider, int status, Bundle extras) {
                        }

                        @Override
                        public void onProviderEnabled(String provider) {
                        }

                        @Override
                        public void onProviderDisabled(String provider) {
                        }

                        @Override
                        public void onLocationChanged(final Location location) {
                        }
                    });
            Log.d("GPS Enabled", "GPS Enabled");
            source = "GPS";
            if (myLocationManager != null) {
                location = myLocationManager
                        .getLastKnownLocation(LocationManager.GPS_PROVIDER);
                hasPosition = true;
            }
            JSONObject json = new JSONObject();
            if (location != null && hasPosition) {
                json.put("lat", location.getLatitude());
                json.put("lon", location.getLongitude());
                json.put("source", source);
                jsonArray.put(jsonArray.length(), json);
            }
        }
        JSONObject json = new JSONObject();
        ((MapMint4ME) mContext).startLocationUpdates();
        Location location1 = ((MapMint4ME) mContext).getLastLocation();
        if (location1 != null) {
            json.put("lat", location1.getLatitude());
            json.put("lon", location1.getLongitude());
            json.put("source", "other");
            jsonArray.put(jsonArray.length(), json);
        }
        return (jsonArray.toString());
    }

    @JavascriptInterface
    public String getGPS() throws Exception {

        int permissionCheck = ContextCompat.checkSelfPermission(mContext, android.Manifest.permission.ACCESS_FINE_LOCATION);

        if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(((MapMint4ME) mContext), new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, MapMint4ME.MY_PERMISSIONS_REQUEST_GPS);
        }

        boolean hasPosition = false;
        // flag for GPS status
        boolean isGPSEnabled = false;

        // flag for network status
        boolean isNetworkEnabled = false;

        Location location = null; // location

        // The minimum distance to change Updates in meters
        final long MIN_DISTANCE_CHANGE_FOR_UPDATES = 1; // 10 meters

        // The minimum time between updates in milliseconds
        final long MIN_TIME_BW_UPDATES = 1000 * 60 * 1; // 1 minute

        LocationManager myLocationManager;
        myLocationManager = ((MapMint4ME) mContext).getLocationManager();

        // getting GPS status
        isGPSEnabled = myLocationManager
                .isProviderEnabled(LocationManager.GPS_PROVIDER);

        // getting network status
        isNetworkEnabled = myLocationManager
                .isProviderEnabled(LocationManager.NETWORK_PROVIDER);

        String source = null;
        if (!isGPSEnabled && !isNetworkEnabled) {
            return getGPSMin();// no network provider is enabled
        } else {
            // First get location from Network Provider
            if (!isGPSEnabled && isNetworkEnabled) {
                myLocationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER, 1000, 0, new LocationListener() {
                            @Override
                            public void onStatusChanged(String provider, int status, Bundle extras) {
                            }

                            @Override
                            public void onProviderEnabled(String provider) {
                            }

                            @Override
                            public void onProviderDisabled(String provider) {
                            }

                            @Override
                            public void onLocationChanged(final Location location) {
                            }
                        });
                source = "Network";
                Log.d("Network", "Network");
                if (myLocationManager != null) {
                    location = myLocationManager
                            .getLastKnownLocation(myLocationManager.NETWORK_PROVIDER);
                    hasPosition = true;
                }
            } else
                // if GPS Enabled get lat/long using GPS Services
                if (isGPSEnabled) {
                    if (location == null && !hasPosition) {
                        myLocationManager.requestLocationUpdates(
                                LocationManager.GPS_PROVIDER, 1000, 0, new LocationListener() {
                                    @Override
                                    public void onStatusChanged(String provider, int status, Bundle extras) {
                                    }

                                    @Override
                                    public void onProviderEnabled(String provider) {
                                    }

                                    @Override
                                    public void onProviderDisabled(String provider) {
                                    }

                                    @Override
                                    public void onLocationChanged(final Location location) {
                                    }
                                });
                        Log.d("GPS Enabled", "GPS Enabled");
                        source = "GPS";
                        if (myLocationManager != null) {
                            location = myLocationManager
                                    .getLastKnownLocation(LocationManager.GPS_PROVIDER);
                            hasPosition = true;
                        }else{
                            myLocationManager.requestLocationUpdates(
                                    LocationManager.NETWORK_PROVIDER, 1000, 0, new LocationListener() {
                                        @Override
                                        public void onStatusChanged(String provider, int status, Bundle extras) {
                                        }

                                        @Override
                                        public void onProviderEnabled(String provider) {
                                        }

                                        @Override
                                        public void onProviderDisabled(String provider) {
                                        }

                                        @Override
                                        public void onLocationChanged(final Location location) {
                                        }
                                    });
                            source = "Network";
                            Log.d("Network", "Network");
                            if (myLocationManager != null) {
                                location = myLocationManager
                                        .getLastKnownLocation(myLocationManager.NETWORK_PROVIDER);
                                hasPosition = true;
                            }
                        }
                    }
                }
        }

        JSONObject json = new JSONObject();
        if (location != null && hasPosition) {
            json.put("lat", location.getLatitude());
            json.put("lon", location.getLongitude());
            json.put("source", source);
        } else {
            return getGPSMin();
        }

        //String tmp=String.valueOf(loc.getLatitude())+","+String.valueOf(loc.getLongitude());
        return (json.toString());
    }

    @JavascriptInterface
    public String getGPSMin() throws JSONException {
        JSONObject json = new JSONObject();
        ((MapMint4ME) mContext).startLocationUpdates();
        Location location = ((MapMint4ME) mContext).getLastLocation();
        if (location != null) {
            json.put("lat", location.getLatitude());
            json.put("lon", location.getLongitude());

        }
        json.put("source", "other");
        return (json.toString());
    }


    @JavascriptInterface
    public String getLang() throws JSONException {
        return Locale.getDefault().getLanguage();
    }

    @JavascriptInterface
    public String getAUID() {
        return Settings.Secure.getString(mContext.getContentResolver(), Settings.Secure.ANDROID_ID);
    }

    @JavascriptInterface
    public String getMailAccount() {
        Pattern emailPattern = Patterns.EMAIL_ADDRESS; // API level 8+
        int permissionCheck = ContextCompat.checkSelfPermission(((MapMint4ME) mContext), android.Manifest.permission.GET_ACCOUNTS);

        if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(((MapMint4ME) mContext), new String[]{android.Manifest.permission.GET_ACCOUNTS}, MapMint4ME.MY_PERMISSIONS_REQUEST_GPS);
        } else {
            Account[] accounts = AccountManager.get(mContext).getAccountsByType("com.google");
            for (Account account : accounts) {
                if (emailPattern.matcher(account.name).matches()) {
                    return account.name;
                }
            }
        }
        return null;
    }

    /**
     * Set text to the string to be translated
     */
    @JavascriptInterface
    public String translate(String text) {
        try {
            return mContext.getString(mContext.getResources().getIdentifier(text, "string", mContext.getPackageName()));
        } catch (Exception e) {
            return e.toString();
        }
    }

    /**
     * Set mTop to true/false from the web page

    @JavascriptInterface
    public String getOrientation() throws JSONException{
        try {
            ((MapMint4ME)mContext).updateOrientationAngles();
            float[] res=((MapMint4ME)mContext).getOrientationAngles();
            Log.e("Error", "" + res.toString());
            JSONArray jsonArray = new JSONArray();
            for(int i=0;i<3;i++)
                jsonArray.put(i,res[i]);
            float[] res1=((MapMint4ME)mContext).getRotationMatrix();
            Log.e("Error", "" + res.toString());
            for(int i=0;i<3;i++)
                jsonArray.put(i+3,res1[i]);
            return jsonArray.toString();
        } catch (Exception e) {
            Log.e("Error", "" + e.toString());
            return e.toString();
        }
    }*/

    private LocalDB db = null;

    /**
     * Display Table
     */
    @JavascriptInterface
    public String displayTable(String table, String[] fields) {
        //    db.close();
        if (db == null)
            db = new LocalDB(mContext);
        return db.getRows(table, fields).toString();
    }

    /**
     * Rebuild chunk
     */
    @JavascriptInterface
    public String rebuildChunk(String table, String[] fields) {
        //    db.close();
        if (db == null)
            db = new LocalDB(mContext);
        return db.rebuildChunk(table, fields).toString();
    }

    /**
     * Execute Query
     */
    @JavascriptInterface
    public long executeQuery(String query, String[] values, int[] types) {
        if (db == null)
            db = new LocalDB(mContext);
        return db.execute(query, values, types);
    }

    private LocalDB dbs = null;

    /**
     * Display Table from  specific DB
     */
    @JavascriptInterface
    public String displayTableFromDb(String dbName, String table, String[] fields) {
        if (dbs != null)
            dbs.close();
        dbs = new LocalDB(mContext, dbName);
        return dbs.getRows(table, fields);
    }

    private LocalDB dbt = null;

    /**
     * Display tiles
     */
    @JavascriptInterface
    public String displayTile(String xyz) {
        if (dbt != null)
            dbt.close();
        dbt = new LocalDB(mContext, "tiles.db");
        return dbt.getTile(xyz);
    }

    @JavascriptInterface
    public String getNBTiles(String[] values, int[] types) {
        if (dbt != null)
            dbt.close();
        dbt = new LocalDB(mContext, "tiles.db");
        return dbt.getRows("select count(*) as cnt from (select * from tiles limit 2) as a", values);
    }

    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public long executeQueryFromDb(String dbName, String query, String[] values, int[] types) {
        if (dbs != null)
            dbs.close();
        dbs = new LocalDB(mContext, dbName);
        return dbs.execute(query, values, types);
    }

    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public void queryCamera(String id, String cid) {
        ((MapMint4ME) mContext).invokeCamera(id, cid);
    }

    @JavascriptInterface
    public void pickupImage(String id, String cid) {
        ((MapMint4ME) mContext).invokePickupImage(id, cid);
    }

    @JavascriptInterface
    public int getHeight() {
        Display display = ((MapMint4ME) mContext).getWindowManager().getDefaultDisplay();
        Point size = new Point();
        display.getSize(size);
        Log.e("Width", "" + size.x);
        Log.e("height", "" + size.y);
        return size.y;
    }

    private String fileSaved=null;
    @JavascriptInterface
    public void newDownloadFile(final String url) {
        fileSaved=null;
        new Thread(new Runnable() {
            public void run() {
                fileSaved=_downloadFile(url,0);
            }
        }).start();
    }

    @JavascriptInterface
    public String downloadedFile() {
        while(fileSaved!=null);
        return fileSaved;
    }

    @JavascriptInterface
    public void startWelcomeScreen(){
        ((MapMint4ME) mContext).launchWelcomeScreen();
        ((MapMint4ME) mContext).finish();
    }

    @JavascriptInterface
    public void keepScreenOn(){
        ((MapMint4ME) mContext).runOnUiThread(new Runnable() {
            public void run() {
                ((MapMint4ME) mContext).getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    @JavascriptInterface
    public void screenCanGoOff(){
        ((MapMint4ME) mContext).runOnUiThread(new Runnable() {
            public void run() {
                ((MapMint4ME) mContext).getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    private class DownloadFilesTask extends AsyncTask<String, Integer, String> {
        public int id=0;
        protected String doInBackground(String... urls) {
            int count = urls.length;
            long totalSize = 0;
            String res=null;
            for (int i = 0; i < count; i++) {
                //totalSize += Downloader.downloadFile(urls[i]);
                //publishProgress((int) ((i / (float) count) * 100));
                // Escape early if cancel() is called
                res=_downloadFile(urls[i],id);
                if (isCancelled()) break;
            }
            return res;
        }

        public void myProgressPublication(int val){
            publishProgress(val);
        }
        protected void onProgressUpdate(Integer... progress) {
            setProgressPercent(progress[0]);
        }

        public void setProgressPercent(Integer... progress){

        }
        protected void onPostExecute(Long result) {
            //showDialog("Downloaded " + result + " bytes");
        }
    }

    private int counter=0;
    @JavascriptInterface
    public void reinitCounter() {
        counter=0;
    }

    @JavascriptInterface
    public String downloadFile(final String url) {
        /*DownloadFilesTask myTask = new DownloadFilesTask();
        myTask.execute(url);*/
        if(url.contains("tiles")) {
            File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
            String[] tmp = url.split("/");
            final String fileName = asset_dir.getAbsolutePath() + File.separator + tmp[tmp.length - 1];
            ((MapMint4ME) mContext).beginDownload(url,tmp[tmp.length - 1]);
            return "started";
        }else
        try {
            DownloadFilesTask tmp=new DownloadFilesTask();
            tmp.id=counter;
            tmp.execute(url);
            counter+=1;
            return "started";
        }catch(Exception e) {
            return null;
        }
    }

    @TargetApi(Build.VERSION_CODES.KITKAT)
    @JavascriptInterface
    public String _downloadFile(String url, final int id) {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String[] tmp = url.split("/");
        final String fileName = asset_dir.getAbsolutePath() + File.separator + tmp[tmp.length - 1];

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(mContext);
        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(mContext, ((MapMint4ME) mContext).CHANNEL_ID);
        mBuilder.setContentTitle(tmp[tmp.length - 1].split("_")[0])
                .setContentText(tmp[tmp.length - 1])
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        int PROGRESS_MAX = 100;
        int PROGRESS_CURRENT = 0;
        mBuilder.setProgress(PROGRESS_MAX, PROGRESS_CURRENT, false);
        currentId++;
        notificationManager.notify(currentId, mBuilder.build());


        try {
            URL mUrl = new URL(url);
            URLConnection connection = mUrl.openConnection();
            connection.connect();

            int fileLenth = connection.getContentLength();
            BufferedInputStream in = new BufferedInputStream(new URL(url).openStream());
            FileOutputStream fos = new FileOutputStream(fileName);
            BufferedOutputStream bout = new BufferedOutputStream(fos, 1024);
            byte[] data = new byte[1024];
            int x = 0;
            int y=0;
            int myCnt=0;
            Log.w("WebAppInterface", ""+fileLenth);
            int lTot=fileLenth/1024;
            if(lTot==0)
                lTot=1;
            while ((x = in.read(data, 0, 1024)) >= 0) {
                bout.write(data, 0, x);
                myCnt+=x;
                if(myCnt==fileLenth || y%15==0){
                    mBuilder.setContentText((myCnt/(1024*1024))+" / "+(fileLenth/(1024*1024))+" Mb")
                            .setProgress(PROGRESS_MAX, (y*100)/lTot, false);
                    notificationManager.notify(currentId, mBuilder.build());
                    //myTask.myProgressPublication((y*100)/lTot);
                }
                y++;
            }
            mBuilder.setContentText("Completed")
                    .setProgress(PROGRESS_MAX, PROGRESS_MAX, false);
            notificationManager.notify(currentId, mBuilder.build());
            fos.flush();
            bout.flush();
            fos.close();
            bout.close();
            in.close();
            ((MapMint4ME) mContext).runOnUiThread(new Runnable() {
                public void run() {
                    String[] tmp = fileName.split("/");
                    ((MapMint4ME)mContext).getMyWebView().loadUrl("javascript:postUpdate('"+tmp[tmp.length - 1]+"',"+id+");");
                }
            });
            return tmp[tmp.length - 1];
        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            final String exceptionAsString = sw.toString();
            Log.w("WebAppInterface", exceptionAsString);
            mBuilder.setContentTitle("Download Failed")
                    .setProgress(PROGRESS_MAX,PROGRESS_MAX,false);
            notificationManager.notify(currentId, mBuilder.build());
            ((MapMint4ME) mContext).runOnUiThread(new Runnable() {
                public void run() {
                    String[] tmp = fileName.split("/");
                    ((MapMint4ME)mContext).getMyWebView().loadUrl("javascript:downloadFailed('"+exceptionAsString+"',"+id+");");
                }
            });
            return null;
            //showToast("Error: " + exceptionAsString);
        }

    }

    @JavascriptInterface
    public void startReportDirection(){
        ((MapMint4ME)mContext).startReportDirection();
    }

    @JavascriptInterface
    public void stopReportDirection(){
        ((MapMint4ME)mContext).stopReportDirection();
    }

    @JavascriptInterface
    public String getBaseLayers() throws JSONException, IOException {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String srcName = asset_dir.getAbsolutePath() + File.separator + "baseLayers.json";
        File fin0 = new File(srcName);
        if(fin0.exists()) {
            FileInputStream fin = new FileInputStream(srcName);
            byte[] buffer = new byte[(int)fin0.length()];
            int r;
            while ((r = fin.read(buffer)) != -1) {
                return new String(buffer);
            }
        }
        return null;
    }

    @JavascriptInterface
    public String getGNStatus() throws JSONException {
        JSONObject json = new JSONObject();
        ConnectivityManager connectivityManager
            = (ConnectivityManager) mContext.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        json.put("net",(activeNetworkInfo!=null&&activeNetworkInfo.isConnected()));
        try{
            json.put("gps",getFullGPS());
        }
        catch(Exception e){
            Log.d("BUG GPS!", e.toString());
        }
        return json.toString();
    }

    @JavascriptInterface
    public boolean getTilesDownloadStatus() {
        return ((MapMint4ME)mContext).getDownloadStatus();
    }

    @JavascriptInterface
    public boolean copyFile(String src,String dest) {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String srcName = asset_dir.getAbsolutePath() + File.separator + src;
        String destName = asset_dir.getAbsolutePath() + File.separator + dest;
        /*try {
            mContext.deleteDatabase(dest);
        }catch(Exception e) {
            Log.d("Unable to delete database!", e.toString());
        }*/
        FileInputStream fin = null;
        try {
            fin = new FileInputStream(srcName);
            FileOutputStream fos = new FileOutputStream(destName);
            byte[] buffer = new byte[1024];
            int read;
            while ((read = fin.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
            }
            fin.close();
            File srcFile= new File(srcName);
            srcFile.delete();

            fos.flush();
            fos.close();
            fos = null;
            return true;
        } catch (Exception e) {
            Log.d("Unable to copy file database!", e.toString());
            e.printStackTrace();
            return false;
        }
    }

    @JavascriptInterface
    public void refreshDbs() {
        if (dbs != null)
            dbs.close();
        dbs=null;
        if (db != null)
            db.close();
        db=null;
    }

    public boolean copyFileA(String src,String dest) {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String srcName = mContext.getExternalFilesDir(null).getAbsolutePath() + File.separator + src;
        String destName = asset_dir.getAbsolutePath() + File.separator + dest;
        /*try {
            mContext.deleteDatabase(dest);
        }catch(Exception e) {
            Log.d("Unable to delete database!", e.toString());
        }*/
        FileInputStream fin = null;
        try {
            if(dbt!=null)
                dbt.close();
            fin = new FileInputStream(srcName);
            FileOutputStream fos = new FileOutputStream(destName);
            byte[] buffer = new byte[1024];
            int read;
            while ((read = fin.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
            }
            fin.close();
            File srcFile= new File(srcName);
            srcFile.delete();

            fos.flush();
            fos.close();
            fos = null;
            dbt=null;
            Log.d("Copy file database","success");
            return true;
        } catch (Exception e) {
            Log.d("Unable to copy file database!", e.toString());
            e.printStackTrace();
            return false;
        }
    }

    @JavascriptInterface
    public Integer getCurrentAndroidOSersion(){
        return android.os.Build.VERSION.SDK_INT;
    }

    @JavascriptInterface
    public String getErrorMsg(){
        return errorMsg;
    }

    /*private class UploadFilesTask extends AsyncTask<String, Integer, String> {
        protected String doInBackground(String... urls) {
            long totalSize = 0;
            if(urls.length>2) {
                String res = uploadFile(urls[0], urls[1], urls[2]);
                if(res!=null)
                    return "Completed";
                else
                    return "Failed";
            }else
                return null;
        }

        public void myProgressPublication(int val){
            publishProgress(val);
        }
        protected void onProgressUpdate(Integer... progress) {
            setProgressPercent(progress[0]);
        }

        public void setProgressPercent(Integer... progress){

        }
        protected void onPostExecute(Long result) {
            //showDialog("Downloaded " + result + " bytes");
        }
    }

    @JavascriptInterface
    public String uploadFile(final String url,final String field,final String file) {
        try {
            return new UploadFilesTask().execute(url,field,file).get();
        }catch(Exception e) {
            return null;
        }
    }*/

    @TargetApi(Build.VERSION_CODES.KITKAT)
    @JavascriptInterface
    public boolean uploadFile(String url,String field,String file) {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String[] tmp = url.split("/");
        String fileName = asset_dir.getAbsolutePath() + File.separator + tmp[tmp.length - 1];
        Log.w("WebAppInterface", url);

        /*NotificationManagerCompat notificationManager = NotificationManagerCompat.from(mContext);
        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(mContext, ((MapMint4ME) mContext).CHANNEL_ID);
        mBuilder.setContentTitle(tmp[tmp.length - 1].split("_")[0])
                .setContentText(tmp[tmp.length - 1])
                .setSmallIcon(R.mipmap.ic_launcher)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        int PROGRESS_MAX = 100;
        int PROGRESS_CURRENT = 0;
        mBuilder.setProgress(PROGRESS_MAX, PROGRESS_CURRENT, false);
        currentId++;
        notificationManager.notify(currentId, mBuilder.build());*/

        String attachmentName = field;
        String attachmentFileName = file;
        String crlf = "\r\n";
        String twoHyphens = "--";
        String boundary="----" + System.currentTimeMillis();
        Log.w("WebAppInterface", url);
        try {

            CookieManager mCookieManager = CookieManager.getInstance();
            String[] urlElements=url.split("/");
            String vurl=new String(urlElements[0]+"//"+urlElements[2]);
            String cookies = ((MapMint4ME)mContext).getCookies().getCookie(vurl);
            Log.w("WebAppInterface", cookies);
            //List<HttpCookie> cookies=mCookieManager.getCookieStore().getCookies();

            URL curl = new URL(url);

            File asset_dir1 = new File(mContext.getFilesDir()+File.separator+"data");
            String reqfile = asset_dir1.getAbsolutePath() + File.separator + "request";

            HttpURLConnection conn = (HttpURLConnection) curl.openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("Accept-Charset", "utf-8");
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Cookie", cookies);
            conn.setRequestProperty("Connection", "Keep-Alive");
            conn.setRequestProperty("Cache-Control", "no-cache");
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            conn.setUseCaches(false);
            conn.setDoOutput(true);
            conn.setDoInput(true);

            FileOutputStream os0 = new FileOutputStream(reqfile);
            PrintWriter writer = new PrintWriter(new OutputStreamWriter(os0, "utf-8"),
                    true);//new PrintStream(os0);

            writer.append(twoHyphens + boundary + crlf);
            writer.append("Content-Disposition: form-data; name=\"" +
                    attachmentName + "\"; filename=\"" +
                    attachmentFileName + "\"" + crlf);
            writer.append("Content-Type: application/octet-stream"+crlf+crlf);
            writer.flush();
            os0.flush();

            FileInputStream inputStream = new FileInputStream(mContext.getFilesDir()+File.separator+"data"+ File.separator + file);

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte [] buffer               = new byte[ 512 ];

            int n = 0;
            while (-1 != (n = inputStream.read(buffer))) {
                os0.write(buffer, 0, n);
            }
            os0.flush();
            inputStream.close();

            writer.append(crlf).flush();
            writer.append(crlf).flush();
            writer.append(twoHyphens + boundary + twoHyphens + crlf);

            writer.close();
            writer=null;
            os0.close();
            os0=null;

            FileInputStream inputStream1 = new FileInputStream(mContext.getFilesDir()+File.separator+"data"+ File.separator + "request");
            ByteArrayOutputStream output1 = new ByteArrayOutputStream();

            //Log.w("WebAppInterface", "status: "+os.toString().length());
            conn.connect();
            OutputStream request = conn.getOutputStream();

            while ((n = inputStream1.read(buffer))>0) {
                request.write(buffer,0,n);
            }
            inputStream1.close();

            request.flush();
            request.close();

            int status = conn.getResponseCode();
            /*mBuilder.setContentText("Upload ...")
                    .setProgress(PROGRESS_MAX, 50, false);*/
            if(status==200) {
                InputStream responseStream = new
                        BufferedInputStream(conn.getInputStream());

                BufferedReader responseStreamReader =
                        new BufferedReader(new InputStreamReader(responseStream));

                String line = "";
                StringBuilder stringBuilder = new StringBuilder();

                while ((line = responseStreamReader.readLine()) != null) {
                    stringBuilder.append(line).append("\n");
                }
                responseStreamReader.close();

                String response = stringBuilder.toString();

                responseStream.close();
                Log.w("WebAppInterface", response);
                conn.disconnect();

                Log.w("WebAppInterface", "end 1");
                /*mBuilder.setContentText("Completed")
                        .setProgress(PROGRESS_MAX, PROGRESS_MAX, false);*/
                return true;
            }else{
                InputStream responseStream = new
                        BufferedInputStream(conn.getInputStream());

                BufferedReader responseStreamReader =
                        new BufferedReader(new InputStreamReader(responseStream));

                String line = "";
                StringBuilder stringBuilder = new StringBuilder();

                while ((line = responseStreamReader.readLine()) != null) {
                    stringBuilder.append(line).append("\n");
                }
                responseStreamReader.close();

                String response = stringBuilder.toString();
                Log.w("WebAppInterface", "Resposne \n"+response);

            }
            conn.disconnect();

            Log.w("WebAppInterface", "end "+status);
            return false;
        }catch (Exception e){
            e.printStackTrace();
            StringWriter sw = new StringWriter();
            new Throwable("").printStackTrace(new PrintWriter(sw));
            String stackTrace = sw.toString();
            Log.w("WebAppInterface", e.getStackTrace().toString());
            errorMsg=e.getStackTrace().toString();
            return false;
        }
    }
}