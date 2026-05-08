# PowerShell script to delete screen.png files in the stitch_iso_9001_gap_manager views
$paths = @(
  "stitch_iso_9001_gap_manager/stitch_iso_9001_gap_manager/vista_0.1_inicio_de_sesi_n/screen.png",
  "stitch_iso_9001_gap_manager/stitch_iso_9001_gap_manager/vista_0.2_registro_configuraci_n_de_contrase_a/screen.png",
  "stitch_iso_9001_gap_manager/stitch_iso_9001_gap_manager/vista_1.2_gestor_de_usuarios_v2/screen.png",
  "stitch_iso_9001_gap_manager/stitch_iso_9001_gap_manager/vista_1.3_gestor_de_espacios_de_trabajo_v2/screen.png"
)

foreach ($p in $paths) {
  $full = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) "..\$p"
  if (Test-Path $full) {
    Write-Output "Deleting: $full"
    Remove-Item $full -Force
  } else {
    Write-Output "Not found: $full"
  }
}

Write-Output "Done."
