// LiveKgb : la logique (connexion, réglages, affichage) est en JS dans src/.
// Ici : les fenêtres, l'icône de la barre des tâches / barre de menu et les raccourcis globaux.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

fn show_panel(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("panel") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Envoie une commande à l'overlay (c'est lui qui garde la connexion et les réglages).
fn to_overlay(app: &AppHandle, event: &str) {
    let _ = app.emit_to("overlay", event, ());
}

#[cfg(target_os = "macos")]
fn mac_overlay_on_top(w: &tauri::WebviewWindow) {
    // Niveau « économiseur d'écran » + visible sur tous les bureaux, y compris les applis en plein écran.
    use objc::runtime::Object;
    use objc::{msg_send, sel, sel_impl};
    if let Ok(ns) = w.ns_window() {
        let ns = ns as *mut Object;
        // CanJoinAllSpaces | Stationary | IgnoresCycle | FullScreenAuxiliary
        let behavior: usize = (1 << 0) | (1 << 4) | (1 << 6) | (1 << 8);
        unsafe {
            let _: () = msg_send![ns, setLevel: 1000isize];
            let _: () = msg_send![ns, setCollectionBehavior: behavior];
        }
    }
}

fn main() {
    let cmd = if cfg!(target_os = "macos") { Modifiers::SUPER } else { Modifiers::CONTROL };
    let stop = Shortcut::new(Some(cmd | Modifiers::SHIFT), Code::KeyX);
    let mute = Shortcut::new(Some(cmd | Modifiers::SHIFT), Code::KeyM);
    let open = Shortcut::new(Some(cmd | Modifiers::SHIFT), Code::KeyK);

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_panel(app)))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts([stop, mute, open])
                .expect("raccourcis")
                .with_handler(move |app, sc, ev| {
                    if ev.state() != ShortcutState::Pressed {
                        return;
                    }
                    if sc.id() == stop.id() {
                        to_overlay(app, "panic");
                    } else if sc.id() == mute.id() {
                        to_overlay(app, "toggle-mute");
                    } else if sc.id() == open.id() {
                        show_panel(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory); // pas d'icône dans le Dock

            // Overlay : clics traversants, au-dessus de tout
            let overlay = app.get_webview_window("overlay").expect("overlay");
            overlay.set_ignore_cursor_events(true)?;
            #[cfg(target_os = "macos")]
            mac_overlay_on_top(&overlay);
            #[cfg(not(target_os = "macos"))]
            overlay.set_always_on_top(true)?;

            // Icône près de l'horloge (Windows) / dans la barre de menu (Mac)
            let open_i = MenuItem::with_id(app, "open", "Ouvrir le panneau", true, None::<&str>)?;
            let mute_i = MenuItem::with_id(app, "mute", "Muet on/off", true, None::<&str>)?;
            let stop_i = MenuItem::with_id(app, "stop", "Stop (vider l'écran)", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &mute_i, &stop_i, &sep, &quit_i])?;

            #[cfg(target_os = "macos")]
            let icon = Image::from_bytes(include_bytes!("../icons/trayTemplate@2x.png"))?;
            #[cfg(not(target_os = "macos"))]
            let icon = Image::from_bytes(include_bytes!("../icons/tray.png"))?;

            TrayIconBuilder::with_id("main")
                .icon(icon)
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("LiveKgb")
                .menu(&menu)
                .show_menu_on_left_click(cfg!(target_os = "macos"))
                .on_menu_event(|app, e| match e.id().as_ref() {
                    "open" => show_panel(app),
                    "mute" => to_overlay(app, "toggle-mute"),
                    "stop" => to_overlay(app, "panic"),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, e| {
                    // Windows : clic gauche = panneau (sur Mac, le clic ouvre le menu)
                    if cfg!(target_os = "macos") {
                        return;
                    }
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = e {
                        show_panel(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|w, e| {
            // Fermer le panneau le cache seulement : l'appli reste en tâche de fond
            if let WindowEvent::CloseRequested { api, .. } = e {
                if w.label() == "panel" {
                    api.prevent_close();
                    let _ = w.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("erreur au lancement de LiveKgb");
}
