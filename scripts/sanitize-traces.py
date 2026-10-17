import base64, os, re, sys, zipfile, glob, shutil, tempfile

def load_env(path='.env'):
    env = {}
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = load_env()
secrets = [env[k] for k in ('SPENDWISE_PROXY_PASSWORD', 'SPENDWISE_SEED_PASSWORD') if env.get(k)]
user = env.get('SPENDWISE_PROXY_USER', '')
basic = base64.b64encode(f"{user}:{env.get('SPENDWISE_PROXY_PASSWORD','')}".encode()).decode()
literal = [s for s in secrets + [basic] if s]

header_re = re.compile(r'("name"\s*:\s*"(?:authorization|proxy-authorization|cookie|set-cookie)"\s*,\s*"value"\s*:\s*")((?:[^"\\]|\\.)*)(")', re.I)
jwt_re = re.compile(r'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}')
gate_re = re.compile(r'(swgate_[A-Za-z0-9_-]+=)[^;"\s\\]+')
cred_re = re.compile(r'("password"\s*:\s*")((?:[^"\\]|\\.)*)(")', re.I)

def clean(text):
    for s in literal:
        text = text.replace(s, '[REDACTED]')
    text = header_re.sub(lambda m: m.group(1) + '[REDACTED]' + m.group(3), text)
    text = jwt_re.sub('[REDACTED_JWT]', text)
    text = gate_re.sub(lambda m: m.group(1) + '[REDACTED]', text)
    text = cred_re.sub(lambda m: m.group(1) + '[REDACTED]' + m.group(3), text)
    return text

def sanitize(zpath):
    changed = 0
    fd, tmp = tempfile.mkstemp(suffix='.zip'); os.close(fd)
    with zipfile.ZipFile(zpath) as src, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            try:
                text = data.decode('utf-8')
                new = clean(text)
                if new != text:
                    changed += 1
                    data = new.encode('utf-8')
            except UnicodeDecodeError:
                pass
            dst.writestr(info, data)
    shutil.move(tmp, zpath)
    return changed

def leaks(zpath):
    hits = 0
    with zipfile.ZipFile(zpath) as z:
        for info in z.infolist():
            data = z.read(info.filename)
            try: text = data.decode('utf-8')
            except UnicodeDecodeError: continue
            if any(s in text for s in literal) or jwt_re.search(text) or header_re.search(text) and '[REDACTED]' not in header_re.search(text).group(2):
                hits += 1
    return hits

paths = sys.argv[1:] or glob.glob('evidence/selected/**/*.zip', recursive=True)
total = 0
for p in sorted(paths):
    n = sanitize(p); total += n
    print(f"{n:3d} archivos saneados · {leaks(p)} fugas restantes · {p}")
print(f"TOTAL archivos internos saneados: {total}")
