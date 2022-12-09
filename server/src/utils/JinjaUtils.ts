export function evalJinjaEnvVar(text: string): string {
  const regex = /{{\s*env_var\(['"](.*)['"]\)\s*}}/g;
  let resultText = text;
  const matches = resultText.match(regex);
  if (matches) {
    matches.forEach(match => {
      const envVar = match.replace(regex, '$1');
      const envVarValue = process.env[envVar];
      if (envVarValue) {
        resultText = resultText.replace(match, envVarValue);
      }
    });
  }
  return resultText;
}
