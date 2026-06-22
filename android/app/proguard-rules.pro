# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Conservar información de depuración (stack traces legibles)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Conservar anotaciones (necesario para Capacitor y reflection)
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# =====================
# Capacitor
# =====================

# Mantener todas las clases del plugin Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.NativePlugin class * { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Conservar métodos nativos accesibles desde JS
-keepclassmembers class * {
    @com.getcapacitor.NativePlugin <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# =====================
# AndroidX / Material
# =====================
-dontwarn androidx.**
-keep class androidx.** { *; }
-keep class com.google.android.material.** { *; }
-dontwarn com.google.android.material.**

# =====================
# WebView / JavaScript Bridge
# =====================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class android.webkit.WebView
-keep class android.webkit.WebViewClient

# =====================
# Apache Cordova (legacy)
# =====================
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# =====================
# App classes
# =====================
-keep class com.p2pledger.app.** { *; }
-keep class com.p2pledger.app.MainActivity { *; }

# =====================
# Optimizaciones
# =====================
# No advertir sobre clases faltantes
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**

# Eliminar logs en release (opcional pero recomendado para seguridad)
-assumenosideeffects class android.util.Log {
    public static *** v(...);
    public static *** d(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
}
