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
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.support.v4.app.ActivityCompat;
import android.support.v4.app.NotificationCompat;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import android.util.Patterns;
import android.view.Gravity;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

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
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;


public class WebAppInterface {
    private boolean mCenter = false;
    private Context mContext;

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

    /**
     * Show a toast from the web page
     */
    @JavascriptInterface
    public void notify(String msg) {
        mManager = (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);
        Intent resultIntent = new Intent(mContext, MapMint4ME.class);
        PendingIntent resultPendingIntent =
                PendingIntent.getActivity(mContext,
                        0,
                        resultIntent,
                        PendingIntent.FLAG_NO_CREATE
                );
        NotificationCompat.Builder mBuilder =
                new NotificationCompat.Builder(mContext)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle("MapMint4ME")
                        .setContentText(msg)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(msg));
        //BigTextStyle myStyle = new NotificationCompat.BigTextStyle().bigText(msg);
        //mBuilder.setStyle(myStyle);
        mBuilder.setContentIntent(resultPendingIntent);
        int mNotificationId = 1;
        NotificationManager mNotifyMgr =
                (NotificationManager) mContext.getSystemService(mContext.NOTIFICATION_SERVICE);
        Notification notification = mBuilder.build();
        notification.flags |= Notification.FLAG_AUTO_CANCEL;
        mNotifyMgr.notify(mNotificationId, notification);

    }

    @JavascriptInterface
    public String getGPS() throws Exception {

        int permissionCheck = ContextCompat.checkSelfPermission(mContext, android.Manifest.permission.ACCESS_FINE_LOCATION);

        if (permissionCheck != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(((MapMint4ME) mContext), new String[]{android.Manifest.permission.ACCESS_FINE_LOCATION}, MapMint4ME.MY_PERMISSIONS_REQUEST_READ_MEDIA);
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
                }
            } else
                // if GPS Enabled get lat/long using GPS Services
                if (isGPSEnabled) {
                    if (location == null && !hasPosition) {
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
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public String translate(String text) {
        return mContext.getString(mContext.getResources().getIdentifier(text, "string", mContext.getPackageName()));
    }

    private LocalDB db = null;

    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public String displayTable(String table, String[] fields) {
        if(db==null)
         db = new LocalDB(mContext);
        return db.getRows(table, fields).toString();
    }

    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public long executeQuery(String query, String[] values, int[] types) {
        if(db==null)
         db = new LocalDB(mContext);
        return db.execute(query, values, types);
    }

    private LocalDB dbs = null;
    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public String displayTableFromDb(String dbName, String table, String[] fields) {
        if(dbs==null)
         dbs = new LocalDB(mContext, dbName);
        return dbs.getRows(table, fields).toString();
    }

    /**
     * Set mTop to true/false from the web page
     */
    @JavascriptInterface
    public long executeQueryFromDb(String dbName, String query, String[] values, int[] types) {
        if(dbs==null)
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
    public String downloadFile(String url) {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String[] tmp = url.split("/");
        String fileName = asset_dir.getAbsolutePath() + File.separator + tmp[tmp.length - 1];

        try {

            BufferedInputStream in = new BufferedInputStream(new URL(url).openStream());
            FileOutputStream fos = new FileOutputStream(fileName);
            BufferedOutputStream bout = new BufferedOutputStream(fos, 1024);
            byte[] data = new byte[1024];
            int x = 0;
            while ((x = in.read(data, 0, 1024)) >= 0) {
                bout.write(data, 0, x);
            }
            fos.flush();
            bout.flush();
            fos.close();
            bout.close();
            in.close();

            return tmp[tmp.length - 1];
        } catch (Exception e) {
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            String exceptionAsString = sw.toString();
            Log.w("WebAppInterface", exceptionAsString);
            showToast("Error: " + exceptionAsString);
        }
        return null;
    }

    @JavascriptInterface
    public boolean copyFile(String src,String dest) {
        File asset_dir = new File(mContext.getFilesDir() + File.separator + "data");
        String srcName = asset_dir.getAbsolutePath() + File.separator + src;
        String destName = asset_dir.getAbsolutePath() + File.separator + dest;
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
            e.printStackTrace();
            return false;
        }
    }

    @TargetApi(Build.VERSION_CODES.KITKAT)
    @JavascriptInterface
    public boolean uploadFile(String url,String field,String file) {

        String attachmentName = field;
        String attachmentFileName = file;
        String crlf = "\r\n";
        String twoHyphens = "--";
        String boundary="----" + System.currentTimeMillis();

        try {

            CookieManager mCookieManager = CookieManager.getInstance();
            String[] urlElements=url.split("/");
            String vurl=new String(urlElements[0]+"//"+urlElements[2]);
            String cookies = ((MapMint4ME)mContext).getCookies().getCookie(vurl);
            Log.w("WebAppInterface", cookies);
            //List<HttpCookie> cookies=mCookieManager.getCookieStore().getCookies();

            URL curl = new URL(url);

            File asset_dir = new File(mContext.getFilesDir()+File.separator+"data");
            String reqfile = asset_dir.getAbsolutePath() + File.separator + "request";

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
            byte [] buffer               = new byte[ 4096 ];

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

                Log.w("WebAppInterface", "end");
                return true;
            }
            conn.disconnect();

            Log.w("WebAppInterface", "end");
            return false;
        }catch (Exception e){
            e.printStackTrace();
            StringWriter sw = new StringWriter();
            new Throwable("").printStackTrace(new PrintWriter(sw));
            String stackTrace = sw.toString();

            Log.w("WebAppInterface", e.getStackTrace().toString());
            return false;
        }
    }
}