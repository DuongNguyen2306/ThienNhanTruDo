param(
  [Parameter(Mandatory=$true)][string]$Dir,
  [Parameter(Mandatory=$true)][string]$OutDir
)

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime] | Out-Null

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) { Write-Error "OCR engine unavailable"; exit 2 }

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$files = Get-ChildItem -Path $Dir -Filter *.jpg | Sort-Object { [int]$_.BaseName }

foreach ($f in $files) {
  $full = $f.FullName
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("### FILE: $($f.Name)")

  try {
    $sf = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($full)) ([Windows.Storage.StorageFile])
    $stream = Await ($sf.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

    [void]$sb.AppendLine("SIZE: $($decoder.PixelWidth)x$($decoder.PixelHeight)")
    foreach ($line in $result.Lines) {
      $parts = @()
      foreach ($w in $line.Words) {
        $r = $w.BoundingRect
        $parts += ("({0},{1},{2}x{3}){4}" -f [int]$r.X, [int]$r.Y, [int]$r.Width, [int]$r.Height, $w.Text)
      }
      [void]$sb.AppendLine(($parts -join ' '))
    }
  } catch {
    [void]$sb.AppendLine("ERROR: $($_.Exception.Message)")
  }

  $outFile = Join-Path $OutDir ($f.BaseName + '.txt')
  [System.IO.File]::WriteAllText($outFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
  Write-Output "wrote $outFile"
}
