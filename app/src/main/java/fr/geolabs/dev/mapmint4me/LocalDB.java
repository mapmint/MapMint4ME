package fr.geolabs.dev.mapmint4me;

import android.content.ContentValues;
import android.content.Context;
import android.content.ContextWrapper;
import android.content.res.AssetManager;
import android.database.Cursor;
import android.database.DatabaseErrorHandler;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteStatement;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Arrays;

class DatabaseContext extends ContextWrapper {

	private static final String DEBUG_CONTEXT = "DatabaseContext";


	public DatabaseContext(Context base) {
		super(base);
	}

	@Override
	public File getDatabasePath(String name)
	{

		File asset_dir = new File(this.getBaseContext().getFilesDir()+File.separator+"data");
		String dbfile = asset_dir.getAbsolutePath() + File.separator + name;
		if (!dbfile.endsWith(".db"))
		{
			dbfile += ".db" ;
		}
		File result = new File(dbfile);
		if (!result.exists()) {
			if (!result.getParentFile().exists())
			{
				result.getParentFile().mkdirs();
			}
			Log.w(DEBUG_CONTEXT, result.getAbsolutePath() + " does not exist!");
			try {
				String[] dirFiles = this.getBaseContext().getAssets().list("data");//new File(this.getBaseContext().getFilesDir()+File.separator+".."+File.separator+"app_webview");
				for (String strFile : dirFiles) {
                    if (Log.isLoggable(DEBUG_CONTEXT, Log.WARN))
					    Log.w(DEBUG_CONTEXT, " CREATE FILE ?? <***> " + strFile +" "+name);
					if(name.equals(strFile)) {
                        if (Log.isLoggable(DEBUG_CONTEXT, Log.WARN))
						    Log.w(DEBUG_CONTEXT, " CREATE FILE <***> " + strFile);
						InputStream in = this.getBaseContext().getAssets().open("data/" + strFile);
						new File(dbfile).createNewFile();
						FileOutputStream out = new FileOutputStream(dbfile);
						byte[] buffer = new byte[1024];
						int read;
						while ((read = in.read(buffer)) != -1) {
							out.write(buffer, 0, read);
						}
						in.close();
						in = null;
						out.flush();
						out.close();
						out = null;
						// strFile is the file name
					}
				}
			} catch (IOException e) {
				if (Log.isLoggable(DEBUG_CONTEXT, Log.WARN)) {
					Log.w(DEBUG_CONTEXT, result.getAbsolutePath() + " cannot be created! " + e);
				}
			}
		}

		result.setWritable(true);

		return result;
	}

	/* this version is called for android devices >= api-11. thank to @damccull for fixing this. */
	@Override
	public SQLiteDatabase openOrCreateDatabase(String name, int mode, SQLiteDatabase.CursorFactory factory, DatabaseErrorHandler errorHandler) {
		return openOrCreateDatabase(name,mode, factory);
	}

	/* this version is called for android devices < api-11 */
	@Override
	public SQLiteDatabase openOrCreateDatabase(String name, int mode, SQLiteDatabase.CursorFactory factory)
	{
		SQLiteDatabase result = SQLiteDatabase.openOrCreateDatabase(getDatabasePath(name), factory);
		return result;
	}
}

/**
 * {@link SQLiteOpenHelper} that is used as replacement of the localStorage of the webviews.
 * @details this class should not be used. Everything about the localStorage through the application is already handled in HTMLFragment.
 * @author Diane
 */
public class LocalDB extends SQLiteOpenHelper {

	private static Context mContext;

	private static LocalDB mInstance;

	private static final int DATABASE_VERSION = 3;
	private static final String DATABASE_NAME = "local.db";


	/**
	 * Returns an instance of LocalStorage
	 * @param ctx : a Context used to create the database
	 * @return the instance of LocalStorage of the application or a new one if it has not been created before.
	 */
	public static LocalDB getInstance(Context ctx) {
		if (mInstance == null) {
			mInstance = new LocalDB(ctx.getApplicationContext());
		}
		mContext=ctx;
		return mInstance;
	}


	public LocalDB(Context context) {
		super(new DatabaseContext(context),DATABASE_NAME,null,DATABASE_VERSION);
		mContext=context;
	}

	public LocalDB(Context context,String dbName) {
		super(new DatabaseContext(context),dbName,null,DATABASE_VERSION);
		mContext=context;
	}

	@Override
	public void onCreate(SQLiteDatabase db) {

	}

	@Override
	public void onUpgrade(SQLiteDatabase db,int oldVersion, int newVersion) {

	}

    public static byte[] packFile(String name,String filename){
        return null;
    }

    public long execute(String query,String[] values,int[] types) {
        SQLiteDatabase db = getWritableDatabase();
        try {
            long res=0;
            db.beginTransaction();
            SQLiteStatement stmt = db.compileStatement(query);
            stmt.clearBindings();
            for (int i = 0; i < values.length;i++) {
                /*Log.w("LocalDB",
                        "TYPE : > " + types[i] + " < ! ");*/
                switch (types[i]) {
					case 18:
						Log.w("LocalDB",
								"TYPE : > " + types[i] + " < ! ");
						stmt.bindBlob(i+1, values[i].getBytes());
						break;
					case 5:
                        Uri uri=Uri.parse(values[i]);
                        Log.w("LocalDB",
                                "TYPE : > " + types[i] + " >< "+ uri +" < ! ");
                        InputStream inputStream = mContext.getContentResolver().openInputStream(uri);
                        int nRead;
                        ByteArrayOutputStream tmpStream = new ByteArrayOutputStream( );
                        ByteArrayOutputStream contentStream = new ByteArrayOutputStream( );
                        byte[] content=new byte[1024];
                        int cit=0;
                        while ((nRead = inputStream.read(content, 0, content.length)) != -1) {
                            contentStream.write(content, 0, nRead);
                            cit+=nRead;
                        }
                        byte[] bfname = uri.getPath().getBytes();
                        byte[] prefix = null;
                        if(bfname.length<512)
                            prefix = new byte[512 - bfname.length];
                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream( );
                        outputStream.write( bfname );
                        if(bfname.length<512)
                            outputStream.write( prefix );
                        outputStream.write( contentStream.toByteArray() );
                        stmt.bindBlob(i+1, outputStream.toByteArray());
                        break;
                    default:
                        stmt.bindString(i+1, values[i]);
                        break;
                }
            }
            if (query.toLowerCase().indexOf("insert") > 0)
                res=stmt.executeInsert();
            else
                stmt.executeUpdateDelete();
            db.setTransactionSuccessful();
            db.endTransaction();
            db.close();
            return res;
        }catch(Exception e){
            db.endTransaction();
            Log.w("LocalDB",
                    "*** ERROR : > " + e + " < ! ");
            db.close();
            return -1;
        }
    }

	public String getRows(String query, String[]values){
		//JSONObject obj = new JSONObject();
		JSONArray obj = new JSONArray();
        SQLiteDatabase db = this.getReadableDatabase();
		try {
			Cursor cursor = db.rawQuery(query,values);
			int i = 0;
			if (cursor.moveToFirst()) {
				do {
					String[] fields=cursor.getColumnNames();
					JSONObject ljson = new JSONObject();
					for (int j = 0; j < fields.length; j++) {
						try {
                            /*Log.w("LocalDB",
                                    "try field : <"+ fields[j] +"> " + cursor.getString(j) + " < ! ");*/
							ljson.put(fields[j], cursor.getString(j));
						}catch (Exception e) {
                            Log.w("LocalDB",
                                    "ERROR field ("+fields[j]+"): > " + e.getMessage() + " < ! ");

							try {
								byte[] fileContent = cursor.getBlob(j);
								byte[] bytesName = Arrays.copyOfRange(fileContent, 0, 512);
								byte[] bytesContent = Arrays.copyOfRange(fileContent, 512, fileContent.length);
								for(int a=0;a<512;a++) {
									if(bytesName[a]==0) {
										bytesName = Arrays.copyOfRange(fileContent, 0, a);
										break;
									}
								}
								String filename=new String(bytesName);
								String[] separated = filename.split("/");

								File toStore=new File(mContext.getFilesDir(), separated[separated.length-1]);
								FileOutputStream f = new FileOutputStream(toStore);
								f.write(bytesContent);
								f.flush();
								f.close();

								Log.w("LocalDB",
										"BLOB red : > " + separated[separated.length-1] + " < ! ");
								String value="";
								if((separated[separated.length-1]).length()>12) {
									String dfname = separated[separated.length - 1].substring(0, 12);
									value += "<a href='file:///" + mContext.getFilesDir() + "/" + separated[separated.length - 1] + "'>" + dfname + " [...] </a>";
									ljson.put(fields[j], value);
								}else {
									value += "<a href='file:///" + mContext.getFilesDir() + "/" + separated[separated.length - 1] + "'>" + separated[separated.length - 1] + "</a>";
									ljson.put(fields[j], value);
								}
							}catch (Exception e1) {
								Log.w("LocalDB",
										"ERROR " + e1 + " ! ");
								try{
									byte[] value= cursor.getBlob(j);
									String tmp=new String(value);
									String content=tmp.replace("POINT","").replace(" ",",");
									ljson.put(fields[j], content);
									Log.w("LocalDB",
											" ****** OK" + content + " ! ");
								}catch(Exception e2){
									Log.w("LocalDB",
											"ERROR " + e2 + " ! ");
								}
							}
						}
					}
					obj.put(i,ljson);
					i += 1;
				} while (cursor.moveToNext());
			}
			db.close();
		}catch (JSONException e) {
			Log.w("MapMin4ME", e);
            db.close();
			return null;
		}
		return obj.toString();
	}

}
