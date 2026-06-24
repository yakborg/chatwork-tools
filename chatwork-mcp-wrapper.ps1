# chatwork-mcp-wrapper.ps1
# Reads the Chatwork API token from Windows Credential Manager (generic
# credential target "ChatworkApiToken", DPAPI-encrypted, tied to the current
# Windows user) and launches the MCP server with the token in its environment.
#
# This is the "command" registered in .claude.json for the chatwork-mcp server.
# It must write NOTHING to stdout: stdout/stdin are reserved for the MCP
# JSON-RPC stream, which is passed straight through to the child .exe.

$ErrorActionPreference = 'Stop'

$exe    = Join-Path $PSScriptRoot 'bin\chatwork-mcp.exe'
$target = 'ChatworkApiToken'

if (-not (Test-Path $exe)) {
    [Console]::Error.WriteLine("chatwork-mcp.exe not found at: $exe")
    exit 1
}

# --- Read the token from Windows Credential Manager via Win32 CredRead -------
Add-Type -Namespace Win32 -Name Cred -MemberDefinition @'
[DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
[DllImport("advapi32.dll", SetLastError=true)]
public static extern void CredFree(IntPtr cred);

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

$ptr = [IntPtr]::Zero
if (-not [Win32.Cred]::CredRead($target, 1, 0, [ref]$ptr)) {  # 1 = CRED_TYPE_GENERIC
    [Console]::Error.WriteLine("Credential '$target' not found in Windows Credential Manager.")
    [Console]::Error.WriteLine("Run set-chatwork-token.ps1 once to store your Chatwork API token.")
    exit 1
}

try {
    $cred  = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type]([Win32.Cred+CREDENTIAL]))
    $token = ''
    if ($cred.CredentialBlobSize -gt 0) {
        $bytes = New-Object byte[] $cred.CredentialBlobSize
        [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
        $token = [System.Text.Encoding]::Unicode.GetString($bytes)
    }
} finally {
    [Win32.Cred]::CredFree($ptr)
}

# --- Launch the MCP server with stdio passed straight through -----------------
# UseShellExecute=$false and no stream redirection => the child inherits this
# process's stdin/stdout/stderr (the pipes from Claude Code) directly, so the
# JSON-RPC stream is never touched by PowerShell. The token is set only on the
# child's environment, not on this PowerShell session.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName        = $exe
$psi.UseShellExecute = $false
$psi.EnvironmentVariables['CHATWORK_API_TOKEN'] = $token

$p = [System.Diagnostics.Process]::Start($psi)
$p.WaitForExit()
exit $p.ExitCode
