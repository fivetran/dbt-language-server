export function evalJinjaEnvVar(text: string): string {
  const regex = /{{\s*env_var\((['"].*?['"])\)\s*}}/g;
  let resultText = text;
  const matches = resultText.match(regex);
  if (matches) {
    matches.forEach(match => {
      const params = match
        .replaceAll(regex, '$1')
        .split(',')
        .map(p => p.trim().replace(/^['"]/, '').replace(/['"]$/, ''));

      if (params.length > 0) {
        const envVarValue = process.env[params[0]];
        if (envVarValue) {
          resultText = resultText.replace(match, envVarValue);
        } else if (params.length > 1) {
          resultText = resultText.replace(match, params[1]);
        }
      }
    });
  }
  return resultText;
}
