# Password blocklist — provenance & licence

The common-password blocklist lives at
`src/server/auth/data/common-passwords.txt` and is compiled into
`src/server/auth/data/common-passwords.ts` (a `Set<string>` literal so the
bundle/tests need no filesystem).

## Source

- **List:** SecLists → `Passwords/Common-Credentials/10k-most-common.txt`
- **Repository:** https://github.com/danielmiessler/SecLists
- **Licence:** MIT (permissive, compatible with this project's use)
- **Fetched:** 2026-11-23
- **Entries:** ~10 000 (spec: "a few thousand is enough" — the top-10k is
  the smallest maintained canonical list that covers it)

## Regenerating

```powershell
$r = Invoke-WebRequest -Uri "https://raw.githubusercontent.com/danielmiessler/SecLists/master/Passwords/Common-Credentials/10k-most-common.txt" -UseBasicParsing
[System.IO.File]::WriteAllText("src/server/auth/data/common-passwords.txt", $r.Content.TrimStart([char]0xFEFF,'?'), (New-Object System.Text.UTF8Encoding $false))
node -e "const fs=require('fs');const w=fs.readFileSync('src/server/auth/data/common-passwords.txt','utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);fs.writeFileSync('src/server/auth/data/common-passwords.ts','/** GENERATED from SecLists 10k-most-common (MIT) - see docs/security/password-blocklist.md */\nexport const COMMON_PASSWORDS: ReadonlySet<string> = new Set([\n'+w.map(x=>'  '+JSON.stringify(x)).join(',\n')+'\n]);\n')"
```

## Semantics

`validatePasswordPolicy` checks membership case-insensitively (lowercase
lookup). The blocklist is advisory strength guidance, not a secrecy
boundary — its contents are intentionally public.
