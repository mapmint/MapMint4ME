package fr.geolabs.dev.mapmint4me;


import android.net.Uri;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import com.google.ar.core.Anchor;
import com.google.ar.sceneform.AnchorNode;
import com.google.ar.sceneform.rendering.ModelRenderable;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;

public class CloudAnchor extends AppCompatActivity {

    private DatabaseReference mDatabase;
    private DatabaseReference mref;
    private DatabaseReference mload;

    EditText anchorid;
    Button resolve;
    private CustomArFragment arFragment;

    private enum AppAnchorState {
        NONE,
        HOSTING,
        HOSTED
    }

    private AppAnchorState appAnchorState = AppAnchorState.NONE;

    private Anchor anchor;

    private boolean isPlaced = false;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.cloudanchor);
        mDatabase = FirebaseDatabase.getInstance().getReference();

        mload=mDatabase.child("lastcode");

        anchorid =(EditText)findViewById(R.id.editText);
        resolve=(Button)findViewById(R.id.resolve);



        arFragment = (CustomArFragment) getSupportFragmentManager().findFragmentById(R.id.fragment);

        arFragment.setOnTapArPlaneListener((hitResult, plane, motionEvent) -> {

            if (!isPlaced) {

                anchor = arFragment.getArSceneView().getSession().hostCloudAnchor(hitResult.createAnchor());

                appAnchorState = AppAnchorState.HOSTING;


                createModel(anchor);

                isPlaced = true;

            }


        });


        arFragment.getArSceneView().getScene().addOnUpdateListener(frameTime -> {

            if (appAnchorState != AppAnchorState.HOSTING)
                return;

            Anchor.CloudAnchorState cloudAnchorState = anchor.getCloudAnchorState();

            if (cloudAnchorState.isError()) {
                showToast(cloudAnchorState.toString());
            } else if (cloudAnchorState == Anchor.CloudAnchorState.SUCCESS) {
                showToast("Hosting Anchor..... " );

                appAnchorState = AppAnchorState.HOSTED;
                String anchorId = anchor.getCloudAnchorId();





                mload.addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(DataSnapshot dataSnapshot) {

                        String value = (String) dataSnapshot.getValue();


                        mDatabase.child(value).setValue(anchorId);

                        showToast("Anchor Hosted On Room Code : "+ value);

                        int i = Integer.parseInt(value);
                        i=i+1;
                        mDatabase.child("lastcode").setValue(""+i);

                        resolve.setEnabled(false);
                        anchorid.setEnabled(false);







                    }

                    @Override
                    public void onCancelled(DatabaseError databaseError) {
                        showToast("Firebase Error");

                    }


                });





            }

        });

    }

    private void showToast(String toString) {
        Toast.makeText(CloudAnchor.this, toString, Toast.LENGTH_SHORT).show();
    }

    private void createModel(Anchor anchor) {

        ModelRenderable.builder().setSource(this, Uri.parse("model.sfb")).build()
                .thenAccept(modelRenderable -> placeModel(anchor, modelRenderable));

    }

    private void placeModel(Anchor anchor, ModelRenderable modelRenderable) {

        AnchorNode anchorNode = new AnchorNode(anchor);
        anchorNode.setRenderable(modelRenderable);
        arFragment.getArSceneView().getScene().addChild(anchorNode);
    }

    public void OnButtonClick(View v)
    {
        String code=anchorid.getText().toString();

            mref = mDatabase.child(code);


            mref.addListenerForSingleValueEvent(new ValueEventListener() {
                @Override
                public void onDataChange(DataSnapshot dataSnapshot) {

                    try {
                        String value = (String) dataSnapshot.getValue();

                        if(value.equals(""))
                            showToast("Room Code Unavalible");
                        else
                        {



                            showToast("Cloud Anchor Loaded:" + value);
                            Anchor resolvedAnchor = arFragment.getArSceneView().getSession().resolveCloudAnchor(value);
                            createModel(resolvedAnchor);

                            resolve.setEnabled(false);
                            anchorid.setEnabled(false);

                        }
                    }
                    catch (NullPointerException e)
                    {

                        showToast("Enter Valid Anchor Room Code");
                    }




                }

                @Override
                public void onCancelled(DatabaseError databaseError) {
                    showToast("Firebase Error");

                }


            });




    }



}



