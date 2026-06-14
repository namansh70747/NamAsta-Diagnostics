mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init_schema",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_data",
            sql: include_str!("../migrations/0002_seed.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "panel_bundles_and_orphan_cleanup",
            sql: include_str!("../migrations/0003_panels_fix.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "sms_channel_and_settings",
            sql: include_str!("../migrations/0004_sms.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "cbc_analyzer",
            sql: include_str!("../migrations/0005_analyzer.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "cbc_analyzer_network",
            sql: include_str!("../migrations/0006_analyzer_network.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "whatsapp_cloud_api",
            sql: include_str!("../migrations/0007_whatsapp_cloud.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "no_balance_due",
            sql: include_str!("../migrations/0008_no_balance_due.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "more_tests",
            sql: include_str!("../migrations/0009_more_tests.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "fix_ocb_choices",
            sql: include_str!("../migrations/0010_fix_ocb_choices.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "eag_decimals",
            sql: include_str!("../migrations/0011_eag_decimals.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "more_auto_calc",
            sql: include_str!("../migrations/0012_more_auto_calc.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "grandfather_setup",
            sql: include_str!("../migrations/0013_grandfather_setup.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "sharma_admin",
            sql: include_str!("../migrations/0014_sharma_admin.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "sharma_doctors",
            sql: include_str!("../migrations/0015_sharma_doctors.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "fix_setup_and_sharma_text",
            sql: include_str!("../migrations/0016_fix_setup_and_sharma_text.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 17,
            description: "lipid_auto_and_interpretation",
            sql: include_str!("../migrations/0017_lipid_auto_and_interpretation.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 18,
            description: "exact_lipid_hba1c_text",
            sql: include_str!("../migrations/0018_exact_lipid_hba1c_text.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 19,
            description: "bun_auto",
            sql: include_str!("../migrations/0019_bun_auto.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 20,
            description: "glucose_interpretations",
            sql: include_str!("../migrations/0020_glucose_interpretations.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 21,
            description: "more_interpretations",
            sql: include_str!("../migrations/0021_more_interpretations.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:scl.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::save_pdf,
            commands::reveal_in_folder,
            commands::open_path,
            commands::send_email,
            commands::backup_now,
            commands::restore_backup,
            commands::save_pdf_bytes,
            commands::send_sms,
            commands::serial_list_ports,
            commands::serial_read,
            commands::tcp_capture,
            commands::local_ips,
            commands::device_id,
            commands::whatsapp_send_document,
            commands::copy_file_to_clipboard,
            commands::save_text_file,
            commands::app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
