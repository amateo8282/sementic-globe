#!/usr/bin/env python3
"""
보안 감사 스크립트 - 바이브코딩 프로젝트 보안 취약점 자동 스캔
"""
import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class Finding:
    """보안 취약점 발견 항목"""
    category: str
    severity: str  # critical, high, moderate, low, info
    title: str
    description: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    remediation: str = ""


@dataclass
class AuditResult:
    """감사 결과"""
    findings: list[Finding] = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def add(self, finding: Finding):
        self.findings.append(finding)

    def count_by_severity(self) -> dict:
        counts = {"critical": 0, "high": 0, "moderate": 0, "low": 0, "info": 0}
        for f in self.findings:
            counts[f.severity] = counts.get(f.severity, 0) + 1
        return counts


class SecurityAuditor:
    """보안 감사 실행기"""

    # 민감 패턴 정의
    SECRET_PATTERNS = [
        (r'(?i)(api[_-]?key|apikey)\s*[=:]\s*["\']?[a-zA-Z0-9_-]{20,}', "API Key 하드코딩"),
        (r'(?i)(secret|password|passwd|pwd)\s*[=:]\s*["\'][^"\']+["\']', "시크릿/패스워드 하드코딩"),
        (r'(?i)supabase[_-]?service[_-]?role[_-]?key', "Supabase service_role key 참조"),
        (r'sk-[a-zA-Z0-9]{20,}', "OpenAI API Key"),
        (r'ghp_[a-zA-Z0-9]{36}', "GitHub Personal Access Token"),
        (r'(?i)aws[_-]?secret[_-]?access[_-]?key', "AWS Secret Access Key"),
        (r'eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*', "하드코딩된 JWT 토큰"),
    ]

    # 위험한 NEXT_PUBLIC 패턴
    DANGEROUS_PUBLIC_VARS = [
        "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
        "NEXT_PUBLIC_SECRET",
        "NEXT_PUBLIC_API_SECRET",
        "NEXT_PUBLIC_PRIVATE_KEY",
        "NEXT_PUBLIC_AWS_SECRET",
    ]

    def __init__(self, project_path: str):
        self.project_path = Path(project_path).resolve()
        self.result = AuditResult()

    def run_all_checks(self) -> AuditResult:
        """모든 보안 검사 실행"""
        print(f"🔍 보안 감사 시작: {self.project_path}\n")

        self.check_npm_audit()
        self.check_gitignore()
        self.check_hardcoded_secrets()
        self.check_env_files()
        self.check_supabase_security()
        self.check_api_routes()
        self.check_frontend_security()
        self.check_next_config()

        self.result.summary = self.result.count_by_severity()
        return self.result

    def check_npm_audit(self):
        """npm audit 실행"""
        print("📦 의존성 취약점 검사...")
        package_json = self.project_path / "package.json"

        if not package_json.exists():
            self.result.add(Finding(
                category="dependencies",
                severity="info",
                title="package.json 없음",
                description="Node.js 프로젝트가 아니거나 package.json이 없습니다.",
            ))
            return

        try:
            result = subprocess.run(
                ["npm", "audit", "--json"],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            audit_data = json.loads(result.stdout) if result.stdout else {}

            vulnerabilities = audit_data.get("vulnerabilities", {})
            for pkg_name, vuln_info in vulnerabilities.items():
                severity = vuln_info.get("severity", "moderate")
                self.result.add(Finding(
                    category="dependencies",
                    severity=severity,
                    title=f"취약한 패키지: {pkg_name}",
                    description=f"버전: {vuln_info.get('range', 'unknown')}",
                    remediation=f"npm audit fix 또는 npm update {pkg_name}",
                ))

            if not vulnerabilities:
                print("  ✅ 의존성 취약점 없음")

        except subprocess.TimeoutExpired:
            self.result.add(Finding(
                category="dependencies",
                severity="info",
                title="npm audit 타임아웃",
                description="npm audit 실행 시간 초과",
            ))
        except (json.JSONDecodeError, FileNotFoundError) as e:
            self.result.add(Finding(
                category="dependencies",
                severity="info",
                title="npm audit 실행 실패",
                description=str(e),
            ))

    def check_gitignore(self):
        """gitignore 설정 검사"""
        print("📝 .gitignore 검사...")
        gitignore = self.project_path / ".gitignore"

        required_patterns = [".env", ".env.local", ".env*.local", "node_modules"]
        missing = []

        if gitignore.exists():
            content = gitignore.read_text()
            for pattern in required_patterns:
                # 다양한 형태로 포함되어 있는지 확인
                if pattern not in content and not any(
                    p in content for p in [f"{pattern}\n", f"{pattern} ", f"*{pattern}*"]
                ):
                    if pattern == ".env" and ".env*" in content:
                        continue
                    missing.append(pattern)
        else:
            missing = required_patterns

        if missing:
            self.result.add(Finding(
                category="secrets",
                severity="high",
                title=".gitignore 누락 패턴",
                description=f"다음 패턴이 .gitignore에 없음: {', '.join(missing)}",
                file_path=".gitignore",
                remediation=f".gitignore에 추가: {chr(10).join(missing)}",
            ))
        else:
            print("  ✅ .gitignore 설정 양호")

    def check_hardcoded_secrets(self):
        """하드코딩된 시크릿 검사"""
        print("🔑 하드코딩된 시크릿 검사...")

        # 검사할 확장자
        extensions = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
        exclude_dirs = {"node_modules", ".next", ".git", "dist", "build", ".vercel"}

        found_count = 0
        for file_path in self.project_path.rglob("*"):
            if file_path.suffix not in extensions:
                continue
            if any(exc in file_path.parts for exc in exclude_dirs):
                continue

            try:
                content = file_path.read_text(errors="ignore")
                rel_path = file_path.relative_to(self.project_path)

                for pattern, desc in self.SECRET_PATTERNS:
                    for match in re.finditer(pattern, content):
                        # 라인 번호 계산
                        line_num = content[:match.start()].count("\n") + 1
                        found_count += 1
                        self.result.add(Finding(
                            category="secrets",
                            severity="critical",
                            title=desc,
                            description=f"매칭: {match.group()[:50]}...",
                            file_path=str(rel_path),
                            line_number=line_num,
                            remediation="환경변수로 이동하고 .env 파일에서 관리",
                        ))
            except Exception:
                pass

        if found_count == 0:
            print("  ✅ 하드코딩된 시크릿 없음")

    def check_env_files(self):
        """환경변수 파일 검사"""
        print("🌍 환경변수 파일 검사...")

        for env_file in self.project_path.glob(".env*"):
            if env_file.name == ".env.example":
                continue

            try:
                content = env_file.read_text()

                # NEXT_PUBLIC_ 민감정보 검사
                for line in content.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue

                    for dangerous in self.DANGEROUS_PUBLIC_VARS:
                        if dangerous in line:
                            self.result.add(Finding(
                                category="secrets",
                                severity="critical",
                                title="NEXT_PUBLIC에 민감정보 노출",
                                description=f"클라이언트에 노출되는 환경변수: {line.split('=')[0]}",
                                file_path=env_file.name,
                                remediation="NEXT_PUBLIC_ 접두사 제거하고 서버 사이드에서만 사용",
                            ))
            except Exception:
                pass

    def check_supabase_security(self):
        """Supabase 보안 설정 검사"""
        print("🗄️ Supabase 보안 검사...")

        extensions = {".ts", ".tsx", ".js", ".jsx"}
        exclude_dirs = {"node_modules", ".next", ".git"}

        service_role_client_usage = []
        anon_key_found = False

        for file_path in self.project_path.rglob("*"):
            if file_path.suffix not in extensions:
                continue
            if any(exc in file_path.parts for exc in exclude_dirs):
                continue

            try:
                content = file_path.read_text(errors="ignore")
                rel_path = file_path.relative_to(self.project_path)

                # service_role key를 클라이언트에서 사용하는지 검사
                if "service_role" in content.lower():
                    # app/, pages/, components/ 하위면 클라이언트 코드로 간주
                    if any(p in str(rel_path) for p in ["app/", "pages/", "components/", "src/app/", "src/pages/", "src/components/"]):
                        if "use server" not in content:  # Server Action이 아닌 경우
                            service_role_client_usage.append(str(rel_path))

                if "SUPABASE_ANON_KEY" in content or "supabase" in content.lower():
                    anon_key_found = True

            except Exception:
                pass

        if service_role_client_usage:
            self.result.add(Finding(
                category="database",
                severity="critical",
                title="service_role key 클라이언트 노출 위험",
                description=f"클라이언트 코드에서 service_role 참조: {', '.join(service_role_client_usage[:3])}",
                remediation="service_role key는 반드시 서버 사이드(API Route, Server Action)에서만 사용",
            ))

        # RLS 관련 안내
        if anon_key_found:
            self.result.add(Finding(
                category="database",
                severity="info",
                title="Supabase RLS 수동 확인 필요",
                description="Supabase 대시보드에서 모든 테이블의 RLS 정책 활성화 여부 확인 필요",
                remediation="Supabase 대시보드 > Authentication > Policies에서 각 테이블 RLS 확인",
            ))

    def check_api_routes(self):
        """API 라우트 보안 검사"""
        print("🔌 API 라우트 검사...")

        api_paths = [
            self.project_path / "app" / "api",
            self.project_path / "pages" / "api",
            self.project_path / "src" / "app" / "api",
            self.project_path / "src" / "pages" / "api",
        ]

        route_files = []
        for api_path in api_paths:
            if api_path.exists():
                route_files.extend(api_path.rglob("*.ts"))
                route_files.extend(api_path.rglob("*.js"))

        for route_file in route_files:
            try:
                content = route_file.read_text(errors="ignore")
                rel_path = route_file.relative_to(self.project_path)

                # 인증 체크 없이 민감한 작업 수행 여부
                auth_patterns = [
                    "getServerSession", "auth()", "getSession", "verifyToken",
                    "authenticate", "requireAuth", "withAuth", "getToken"
                ]
                has_auth = any(p in content for p in auth_patterns)

                # 위험한 작업 패턴
                dangerous_ops = ["DELETE", "update", "insert", "create", ".delete(", ".update("]
                has_dangerous_op = any(op in content for op in dangerous_ops)

                if has_dangerous_op and not has_auth:
                    self.result.add(Finding(
                        category="api",
                        severity="high",
                        title="인증 없는 API 라우트",
                        description="데이터 수정 작업이 있지만 인증 체크가 없음",
                        file_path=str(rel_path),
                        remediation="getServerSession() 또는 미들웨어로 인증 추가",
                    ))

                # Rate limiting 체크
                rate_limit_patterns = ["rateLimit", "rateLimiter", "limiter", "throttle"]
                if not any(p in content for p in rate_limit_patterns):
                    # 공개 API만 경고
                    if "POST" in content or "PUT" in content:
                        self.result.add(Finding(
                            category="api",
                            severity="moderate",
                            title="Rate limiting 미설정",
                            description="API 라우트에 Rate limiting이 없음",
                            file_path=str(rel_path),
                            remediation="upstash/ratelimit 또는 미들웨어로 Rate limiting 추가",
                        ))

            except Exception:
                pass

    def check_frontend_security(self):
        """프론트엔드 보안 검사"""
        print("🖥️ 프론트엔드 보안 검사...")

        extensions = {".tsx", ".jsx"}
        exclude_dirs = {"node_modules", ".next", ".git"}

        for file_path in self.project_path.rglob("*"):
            if file_path.suffix not in extensions:
                continue
            if any(exc in file_path.parts for exc in exclude_dirs):
                continue

            try:
                content = file_path.read_text(errors="ignore")
                rel_path = file_path.relative_to(self.project_path)

                # dangerouslySetInnerHTML 검사
                if "dangerouslySetInnerHTML" in content:
                    line_num = content.find("dangerouslySetInnerHTML")
                    line_num = content[:line_num].count("\n") + 1
                    self.result.add(Finding(
                        category="frontend",
                        severity="high",
                        title="dangerouslySetInnerHTML 사용",
                        description="XSS 취약점 위험. 사용자 입력을 렌더링하는 경우 위험",
                        file_path=str(rel_path),
                        line_number=line_num,
                        remediation="DOMPurify로 sanitize하거나 다른 방식으로 렌더링",
                    ))

                # eval 사용 검사
                if re.search(r'\beval\s*\(', content):
                    self.result.add(Finding(
                        category="frontend",
                        severity="critical",
                        title="eval() 사용",
                        description="코드 인젝션 취약점 위험",
                        file_path=str(rel_path),
                        remediation="eval 사용 제거하고 안전한 대안 사용",
                    ))

            except Exception:
                pass

    def check_next_config(self):
        """Next.js 설정 검사"""
        print("⚙️ Next.js 설정 검사...")

        config_files = ["next.config.js", "next.config.mjs", "next.config.ts"]
        config_path = None

        for cf in config_files:
            p = self.project_path / cf
            if p.exists():
                config_path = p
                break

        if not config_path:
            return

        try:
            content = config_path.read_text()

            # 보안 헤더 설정 확인
            if "headers" not in content:
                self.result.add(Finding(
                    category="config",
                    severity="moderate",
                    title="보안 헤더 미설정",
                    description="next.config에 보안 헤더(CSP, X-Frame-Options 등) 설정 없음",
                    file_path=config_path.name,
                    remediation="references/remediation.md의 보안 헤더 설정 참조",
                ))

            # 위험한 설정 검사
            if "dangerouslyAllowSVG" in content:
                self.result.add(Finding(
                    category="config",
                    severity="moderate",
                    title="dangerouslyAllowSVG 활성화",
                    description="SVG 파일을 통한 XSS 공격 가능성",
                    file_path=config_path.name,
                    remediation="SVG 허용이 필요한 경우 contentSecurityPolicy 설정 추가",
                ))

        except Exception:
            pass

    def generate_report(self) -> str:
        """마크다운 리포트 생성"""
        lines = ["# 🔐 보안 감사 리포트\n"]
        lines.append(f"프로젝트: `{self.project_path}`\n")

        # 요약
        summary = self.result.count_by_severity()
        lines.append("## 📊 요약\n")
        lines.append(f"| 심각도 | 개수 |")
        lines.append("|--------|------|")
        lines.append(f"| 🔴 Critical | {summary['critical']} |")
        lines.append(f"| 🟠 High | {summary['high']} |")
        lines.append(f"| 🟡 Moderate | {summary['moderate']} |")
        lines.append(f"| 🟢 Low | {summary['low']} |")
        lines.append(f"| ℹ️ Info | {summary['info']} |")
        lines.append("")

        # 통과 여부
        if summary["critical"] > 0 or summary["high"] > 0:
            lines.append("### ❌ 배포 전 수정 필요\n")
        else:
            lines.append("### ✅ 배포 가능 (권장 수정사항 확인)\n")

        # 상세 내역
        if self.result.findings:
            lines.append("## 🔍 상세 내역\n")

            # 심각도순 정렬
            severity_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3, "info": 4}
            sorted_findings = sorted(
                self.result.findings,
                key=lambda f: severity_order.get(f.severity, 5)
            )

            current_severity = None
            for f in sorted_findings:
                if f.severity != current_severity:
                    current_severity = f.severity
                    emoji = {"critical": "🔴", "high": "🟠", "moderate": "🟡", "low": "🟢", "info": "ℹ️"}
                    lines.append(f"\n### {emoji.get(f.severity, '')} {f.severity.upper()}\n")

                lines.append(f"#### {f.title}")
                lines.append(f"- **카테고리**: {f.category}")
                if f.file_path:
                    loc = f.file_path
                    if f.line_number:
                        loc += f":{f.line_number}"
                    lines.append(f"- **위치**: `{loc}`")
                lines.append(f"- **설명**: {f.description}")
                if f.remediation:
                    lines.append(f"- **조치방법**: {f.remediation}")
                lines.append("")

        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="보안 감사 스크립트")
    parser.add_argument("--path", default=".", help="프로젝트 경로")
    parser.add_argument("--report", action="store_true", help="마크다운 리포트 생성")
    parser.add_argument("--output", default="security-report.md", help="리포트 출력 파일명")

    args = parser.parse_args()

    auditor = SecurityAuditor(args.path)
    result = auditor.run_all_checks()

    print("\n" + "=" * 50)
    print("📋 감사 완료")
    print("=" * 50)

    summary = result.count_by_severity()
    print(f"\n🔴 Critical: {summary['critical']}")
    print(f"🟠 High: {summary['high']}")
    print(f"🟡 Moderate: {summary['moderate']}")
    print(f"🟢 Low: {summary['low']}")
    print(f"ℹ️  Info: {summary['info']}")

    if summary["critical"] > 0 or summary["high"] > 0:
        print("\n❌ 배포 전 수정이 필요합니다!")
    else:
        print("\n✅ 심각한 취약점 없음")

    if args.report:
        report = auditor.generate_report()
        output_path = Path(args.path) / args.output
        output_path.write_text(report)
        print(f"\n📄 리포트 생성: {output_path}")

    # 종료 코드: critical/high 있으면 1
    sys.exit(1 if summary["critical"] > 0 or summary["high"] > 0 else 0)


if __name__ == "__main__":
    main()
