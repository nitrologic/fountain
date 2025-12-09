// chat.cpp
// a slopfountain deno interface

#define _WIN32_WINNT 0x0600
#define WIN32_LEAN_AND_MEAN
#include <winsock2.h>
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

#pragma comment(lib,"ws2_32.lib")

static HANDLE hChildStdInRd, hChildStdInWr,
			  hChildStdOutRd, hChildStdOutWr;

static SOCKET listenSock;

static BOOL create_hidden_console(void)
{
		SECURITY_ATTRIBUTES sa = { sizeof(sa), NULL, TRUE };

		if (!CreatePipe(&hChildStdOutRd, &hChildStdOutWr, &sa, 0))
				return FALSE;
		if (!CreatePipe(&hChildStdInRd, &hChildStdInWr, &sa, 0))
				return FALSE;

		SetHandleInformation(hChildStdOutRd, HANDLE_FLAG_INHERIT, 0);
		SetHandleInformation(hChildStdInWr,  HANDLE_FLAG_INHERIT, 0);

		STARTUPINFOA si = { sizeof(si) };
		si.dwFlags   = STARTF_USESHOWWINDOW | STARTF_USESTDHANDLES;
		si.wShowWindow = SW_HIDE;
		si.hStdInput   = hChildStdInRd;
		si.hStdOutput  = hChildStdOutWr;
		si.hStdError   = hChildStdOutWr;

		PROCESS_INFORMATION pi;
		if (!CreateProcessA("C:\\Windows\\System32\\cmd.exe", NULL, NULL, NULL,
							TRUE, CREATE_NEW_CONSOLE, NULL, NULL, &si, &pi))
				return FALSE;

		CloseHandle(pi.hThread);
		CloseHandle(pi.hProcess);
		return TRUE;
}

static DWORD WINAPI reader_thread(LPVOID clientSocket)
{
		SOCKET s = (SOCKET)clientSocket;
		char buf[4096];
		DWORD nr;
		while (ReadFile(hChildStdOutRd, buf, sizeof(buf), &nr, NULL) && nr) {
				send(s, buf, (int)nr, 0);
		}
		closesocket(s);
		return 0;
}

static void handle_client(SOCKET s)
{
		CreateThread(NULL, 0, reader_thread, (LPVOID)s, 0, NULL);

		char buf[4096];
		int  nr;
		while ((nr = recv(s, buf, sizeof(buf), 0)) > 0) {
				DWORD nw, written = 0;
				while (written < (DWORD)nr) {
						if (!WriteFile(hChildStdInWr, buf + written,
									   nr - written, &nw, NULL))
								break;
						written += nw;
				}
		}
		closesocket(s);
}

int main(void)
{
		WSADATA wsd;
		WSAStartup(MAKEWORD(2,2), &wsd);

		if (!create_hidden_console()) {
				printf("create_hidden_console failed %lu\n", GetLastError());
				return 1;
		}

		listenSock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
		struct sockaddr_in addr = {0};
		addr.sin_family      = AF_INET;
		addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
		addr.sin_port        = htons(8081);

		if (bind(listenSock, (struct sockaddr*)&addr, sizeof(addr)) == SOCKET_ERROR ||
			listen(listenSock, 4) == SOCKET_ERROR) {
				printf("bind/listen failed %d\n", WSAGetLastError());
				return 1;
		}

		printf("slop listening on 127.0.0.1:8081\n");

		while (1) {
				SOCKET client = accept(listenSock, NULL, NULL);
				if (client != INVALID_SOCKET)
						handle_client(client);
		}
		return 0;
}