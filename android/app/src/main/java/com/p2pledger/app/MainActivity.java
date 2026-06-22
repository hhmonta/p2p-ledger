package com.p2pledger.app;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean blockScreenshots = true;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applySecureFlag();
    }

    @Override
    public void onResume() {
        super.onResume();
        applySecureFlag();
    }

    @Override
    public void onPause() {
        super.onPause();
        // Quita FLAG_SECURE cuando la app está en background para evitar
        // el thumbnail negro en la lista de apps recientes.
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    /**
     * Aplica FLAG_SECURE para bloquear screenshots y ocultar el contenido
     * en la lista de apps recientes cuando la app está en foreground.
     */
    private void applySecureFlag() {
        if (blockScreenshots) {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            );
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }
}
