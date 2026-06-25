# set-chatwork-token.ps1
# Stores your Chatwork API token in Windows Credential Manager as a generic
# credential named "ChatworkApiToken". The token is encrypted at rest via DPAPI
# and is only decryptable by your Windows user account on this machine.
#
# Usage:
#   .\set-chatwork-token.ps1            # prompts securely (token never on the command line)
#   .\set-chatwork-token.ps1 -Token x   # non-interactive (token IS visible to history/process args)
#
# Run once. Re-run to rotate/overwrite. Get your token from Chatwork:
#   top-right icon -> Service Integration (サービス連携) -> API Token.

param(
    [string]$Token,
    [string]$Target = 'ChatworkApiToken'
)

if (-not $Token) {
    $sec  = Read-Host 'Chatwork API Token' -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try   { $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    [Console]::Error.WriteLine('No token provided. Aborting.')
    exit 1
}

Add-Type -Namespace Win32 -Name CredW -MemberDefinition @'
[DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool CredWrite(ref CREDENTIAL cred, int flags);

[StructLayout(LayoutKind.Sequential)]
public struct CREDENTIAL {
  public int Flags;
  public int Type;
  public IntPtr TargetName;
  public IntPtr Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public int CredentialBlobSize;
  public IntPtr CredentialBlob;
  public int Persist;
  public int AttributeCount;
  public IntPtr Attributes;
  public IntPtr TargetAlias;
  public IntPtr UserName;
}
'@

$bytes     = [System.Text.Encoding]::Unicode.GetBytes($Token)   # UTF-16LE, matches CredRead decode
$blob      = [System.Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
$targetPtr = [System.Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($Target)
$userPtr   = [System.Runtime.InteropServices.Marshal]::StringToCoTaskMemUni($env:USERNAME)

try {
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $blob, $bytes.Length)

    $cred = New-Object Win32.CredW+CREDENTIAL
    $cred.Type               = 1   # CRED_TYPE_GENERIC
    $cred.TargetName         = $targetPtr
    $cred.CredentialBlobSize = $bytes.Length
    $cred.CredentialBlob     = $blob
    $cred.Persist            = 2   # CRED_PERSIST_LOCAL_MACHINE (per-user, this PC)
    $cred.UserName           = $userPtr

    if ([Win32.CredW]::CredWrite([ref]$cred, 0)) {
        Write-Host "Stored credential '$Target' in Windows Credential Manager."
    } else {
        $err = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        [Console]::Error.WriteLine("CredWrite failed (Win32 error $err).")
        exit 1
    }
} finally {
    [System.Runtime.InteropServices.Marshal]::FreeHGlobal($blob)
    [System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($targetPtr)
    [System.Runtime.InteropServices.Marshal]::FreeCoTaskMem($userPtr)
}
