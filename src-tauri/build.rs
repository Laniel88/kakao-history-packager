fn main() {
    // Force recompile when builder writes a new timestamp
    println!("cargo:rerun-if-changed=.build-stamp");
    tauri_build::build()
}
