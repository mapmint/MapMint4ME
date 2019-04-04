package fr.geolabs.dev.mapmint4me;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.view.View;
import android.text.Html;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.os.Bundle;
import android.support.v4.view.PagerAdapter;
import android.support.v4.view.ViewPager;
import android.widget.LinearLayout;
import android.widget.TextView;

public class WelcomeScreen extends Activity {

    LinearLayout Layout_bars;
    TextView[] bottomBars;
    int[] screens;
    Button Skip, Next;
    ViewPager vp;
    MyViewPagerAdapter myvpAdapter;
    private View mContentView;

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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        this.requestWindowFeature(Window.FEATURE_NO_TITLE);
        this.getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_onboarding);
        screens = new int[]{
                R.layout.slide4,
                R.layout.slide1,
                R.layout.slide2,
                R.layout.slide3,
                R.layout.slide5,
                R.layout.slide6,
                R.layout.slide7,
                R.layout.slide8
        };

        vp = (ViewPager) findViewById(R.id.view_pager);
        Layout_bars = (LinearLayout) findViewById(R.id.layoutBars);
        Skip = (Button) findViewById(R.id.skip);
        Next = (Button) findViewById(R.id.next);
        myvpAdapter = new MyViewPagerAdapter();
        vp.setAdapter(myvpAdapter);
        Next.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                int i = getItem(+1);
                if (i < screens.length) {
                    vp.setCurrentItem(i);
                } else {
                    launchMain();
                }
            }
        });
        Skip.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                launchMain();
            }
        });
        ColoredBars(0);

        //preferenceManager = new PreferenceManager(this);
        vp.addOnPageChangeListener(viewPagerPageChangeListener);

        //TextView test2 = (TextView)findViewById(R.id.slide_desc1);
        //test2.setText(Html.fromHtml(getString(R.string.slide_1_desc)));
        /*if (!preferenceManager.isShown()) {
            launchMain();
            finish();
        }*/
    }

    public void next(View v) {
        int i = getItem(+1);
        if (i < screens.length) {
            vp.setCurrentItem(i);
        } else {
            launchMain();
        }
    }

    public void skip(View view) {
        launchMain();
    }

    private void ColoredBars(int thisScreen) {
        int[] colorsInactive = getResources().getIntArray(R.array.dot_on_page_not_active);
        int[] colorsActive = getResources().getIntArray(R.array.dot_on_page_active);
        bottomBars = new TextView[screens.length];

        Layout_bars.removeAllViews();
        for (int i = 0; i < bottomBars.length; i++) {
            bottomBars[i] = new TextView(this);
            bottomBars[i].setTextSize(75);
            bottomBars[i].setText(Html.fromHtml("¯"));
            Layout_bars.addView(bottomBars[i]);
            bottomBars[i].setTextColor(colorsInactive[thisScreen]);
        }
        if (bottomBars.length > 0)
            bottomBars[thisScreen].setTextColor(colorsActive[thisScreen]);
    }

    private int getItem(int i) {
        return vp.getCurrentItem() + i;
    }

    private void launchMain() {
        Log.d("fr.geolabs.dev.mapmint4me  MainActivity", "launchMain!");
        //preferenceManager.setShown(true);
        startActivity(new Intent(WelcomeScreen.this, MapMint4ME.class));
        finish();

    }

    ViewPager.OnPageChangeListener viewPagerPageChangeListener = new ViewPager.OnPageChangeListener() {

        @Override
        public void onPageSelected(int position) {
            if(position==0) {
                //TextView test1 = (TextView) findViewById(R.id.title);
                //test1.setTextSize(18);
                TextView test2 = (TextView) findViewById(R.id.introduction);
                test2.setText(Html.fromHtml(getString(R.string.introduction)));
                test2.setTextSize(14);
            }
            ColoredBars(position);
            if (position == screens.length - 1) {
                Next.setText("start");
                Skip.setVisibility(View.GONE);
            } else {
                Next.setText(getString(R.string.next));
                Skip.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onPageScrolled(int arg0, float arg1, int arg2) {

        }

        @Override
        public void onPageScrollStateChanged(int arg0) {

        }
    };

    public class MyViewPagerAdapter extends PagerAdapter {
        private LayoutInflater inflater;

        public MyViewPagerAdapter() {
        }

        @Override
        public Object instantiateItem(ViewGroup container, int position) {
            inflater = (LayoutInflater) getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            View view = inflater.inflate(screens[position], container, false);
            container.addView(view);
            if(position==0) {
                //TextView test1 = (TextView) findViewById(R.id.title);
                //test1.setTextSize(18);
                TextView test2 = (TextView) findViewById(R.id.introduction);
                test2.setText(Html.fromHtml(getString(R.string.introduction)));
                test2.setTextSize(14);
            }
            return view;
        }

        @Override
        public int getCount() {
            return screens.length;
        }

        @Override
        public void destroyItem(ViewGroup container, int position, Object object) {
            View v = (View) object;
            container.removeView(v);
        }

        @Override
        public boolean isViewFromObject(View v, Object object) {
            return v == object;
        }
    }
}